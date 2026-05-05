package com.brightsign.workshop;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.format.DateTimeFormatter;

public class HelloExtension {

    private static final int HTTP_PORT = 8080;
    private static final String LOG_PATH = "/tmp/hello-extension.log";
    private static final String CONTENT_TYPE_JSON = "application/json";
    private static final int HTTP_OK = 200;

    public static void main(String[] args) throws IOException {
        long startMillis = System.currentTimeMillis();

        writeStartupLog();

        HttpServer server = HttpServer.create(new InetSocketAddress(HTTP_PORT), 0);
        server.createContext("/", exchange -> handleRoot(exchange, startMillis));
        server.start();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> shutDown(server)));
    }

    private static void handleRoot(HttpExchange exchange, long startMillis) throws IOException {
        long uptimeSeconds = (System.currentTimeMillis() - startMillis) / 1000;
        String body = "{\"message\":\"Hello from BrightSign!\",\"uptime_seconds\":" + uptimeSeconds + "}";
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set("Content-Type", CONTENT_TYPE_JSON);
        exchange.sendResponseHeaders(HTTP_OK, bytes.length);

        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static void writeStartupLog() {
        String timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        String line = "hello-extension started at " + timestamp + System.lineSeparator();
        try {
            Files.write(
                Paths.get(LOG_PATH),
                line.getBytes(StandardCharsets.UTF_8),
                StandardOpenOption.CREATE,
                StandardOpenOption.APPEND
            );
        } catch (IOException e) {
            // /tmp is writable on the player; log write failure is non-fatal but worth surfacing
            System.err.println("failed to write startup log: " + e.getMessage());
        }
    }

    private static void shutDown(HttpServer server) {
        System.err.println("hello-extension stopping");
        // Delay of 0 means stop immediately, rejecting queued requests
        server.stop(0);
    }
}
