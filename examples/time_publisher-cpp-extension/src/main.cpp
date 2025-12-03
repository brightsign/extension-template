#include <atomic>
#include <csignal>
#include <cstring>
#include <iostream>
#include <memory>
#include <mutex>
#include <thread>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>


static std::atomic<bool> g_running(true);

void signalHandler(int signum) {
    std::cout << "Caught signal " << signum << ", shutting down..." << std::endl;
    g_running = false;
}

std::string getCurrentTimeISO8601() {
    auto now = std::chrono::system_clock::now();
    auto itt = std::chrono::system_clock::to_time_t(now);
    std::ostringstream ss;
    ss << std::put_time(gmtime(&itt), "%FT%TZ");
    return ss.str();
}

int main(int argc, char* argv[]) {
    auto file_prefix = "";

    // Parse command line arguments
    int port = 5005; // Default  port

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--port") == 0 && i + 1 < argc) {
            port = atoi(argv[i + 1]);
            i++;
        } else if (strcmp(argv[i], "--help") == 0) {
            std::cout << "Usage: " << argv[0] << " [--port PORT]" << std::endl;
            return 0;
        }
    }

    // Set up signal handlers
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);

    // Create UDP socket
    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) {
        std::cerr << "Failed to create socket" << std::endl;
        return 1;
    }

    // Set up destination address
    struct sockaddr_in dest_addr;
    memset(&dest_addr, 0, sizeof(dest_addr));
    dest_addr.sin_family = AF_INET;
    dest_addr.sin_port = htons(port);
    if (inet_aton("127.0.0.1", &dest_addr.sin_addr) == 0) {
        std::cerr << "Invalid IP address" << std::endl;
        close(sock);
        return 1;
    }

    std::cout << "Broadcasting time to 127.0.0.1:" << port << std::endl;

    try {
        // Run until terminated
        while (g_running) {
            std::string time_str = getCurrentTimeISO8601() + "\n";
            sendto(sock, time_str.c_str(), time_str.length(), 0,
                   (struct sockaddr*)&dest_addr, sizeof(dest_addr));
            
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        close(sock);
        return 1;
    }

    close(sock);
    std::cout << "Exporter shutdown complete" << std::endl;
    return 0;
}