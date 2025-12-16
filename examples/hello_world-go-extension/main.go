package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "5010"
	}

	// Resolve UDP address
	addr, err := net.ResolveUDPAddr("udp", "127.0.0.1:"+port)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to resolve UDP address: %v\n", err)
		os.Exit(1)
	}

	// Create UDP connection
	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create UDP connection: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close()

	fmt.Printf("Hello World Go Extension starting on port %s...\n", port)
	fmt.Printf("Broadcasting to 127.0.0.1:%s\n", port)

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Create ticker for periodic messages
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	// Main loop
	for {
		select {
		case <-ticker.C:
			// Create and send message
			msg := fmt.Sprintf("Hello World from Go: %s\n", time.Now().UTC().Format(time.RFC3339))
			_, err := conn.Write([]byte(msg))
			if err != nil {
				fmt.Fprintf(os.Stderr, "UDP send error: %v\n", err)
			} else {
				fmt.Print(msg)
			}
		case sig := <-sigChan:
			fmt.Printf("\nReceived signal %v, shutting down...\n", sig)
			fmt.Println("Hello World Go Extension shutdown complete")
			return
		}
	}
}
