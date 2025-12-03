# Building Extensions for BrightSign Players

_A Workshop_

- Version 1.1
- December 2025

## Introduction

The "BrightSign OS Extensions" feature allows BrightSign partners to run
their own code on BrightSign products. This feature allows partners to
write their own squashfs file system to a volume in the internal flash
storage of the player. This file system will be mounted automatically when
the device starts up and the extension's init script will be run. At
shutdown the same script will be run again (with a different parameter) to stop the extension.
While this mechanism is primarily used to install new executable code, data or other files could be installed by this mechanism.

This repository presents a self-guided Workshop that the reader can use as a guide to creating, debugging, and deploying extensions.  At the end of this workshop, you will have

1. Learnt how to un-secure a player for development
2. [Optional] Built a personal, cross-compilation SDK you can use for this and future extension projects. If your needs for this SDK change or you wish to update for a future OS release, you can return back to this guide to adapt and rebuild your SDK
3. Built a small, sample extension that publishes the current time over UDP by using the SDK you built
4. an Understanding of the Lifecycle of Extension and how to package Extensions for development
5. Information about submitting your Extension for approval/signing by BrightSign
6. Learnt how to re-secure an un-secure player

## Requirements

To complete this workshop, you will need:

* a development host with an **x86 architecture CPU** and running **Linux** (Windows with WSL does NOT work!)
* the tooling to make a squashfs file system - easily installed on a debian-based system using "apt get install squashfs-tools"
* a BrightSign Player running OS v 9.x or later (extensions are supported on earlier releases, but this workshop was only tested with 9.x)
* serial cabling to connect the player's serial port to the development host

## Un-Secure the Player for Development

In this step, you will prepare your player for development.

### Pre-Requisites

* A player in production, factory reset condition with the Diagnostic Web Server (DWS) enabled.

Consult the [Setup](https://docs.brightsign.biz/how-tos/factory-reset-a-player) instructions for a new player if uncertain about this or to get your player into this state.

### Unsecure the Player

1. Connect the player you will use for development to your development PC over Serial -- [Serial-Connection](./spells/Serial-Connection.md)
2. Unsecure the player -- [Un-Secure-Player](./spells/Un-Secure-Player.md)
3. Setup and verify ssh communications to the player -- [Telnet and SSH](https://docs.brightsign.biz/advanced/telnet-and-ssh)

### Validation

Ensure that

1. The Player is sending console to your serial monitor program
2. you can connect to the player over SSH
3. you can access the BrightScript debugger and get to the Linux shell

   * `Ctrl-C` in the SSH session to get to the debugger
   * type `exit` to get to the BrightSign Intpreter
   * type `exit` again to access the Linux shell

4. inspect the process table from the Linux shell with `ps`

**Do not proceed until all the above are functional!**

## Getting Started

1. Browse the `examples/` folders.
2. Read the included documentation and code comments.
3. Use either of the examples as a foundation for your own BrightSign extension.

## Developing Extensions

The `examples/` folder contains example extensions demonstrating how to build and integrate with the BrightSign platform. The examples showcase common patterns, best practices, and provide a starting point for developing your own extensions.

Note that the `hello-world-js-extension` does NOT require building the SDK, while the `time-publisher-cpp-extension` does. Based on your extension needs, you can choose the appropriate example to begin with.

### Common Aspects

Each example includes the following common files:

- `README.md`: A README document with setup and usage instructions.
- `src/*`: A directory containing the main source code for the extension.
- `bsext_init`: An initialization script that launches the extension on the BrightSign device.

In addition, there are common scripts shared across all examples:

- `examples/common-scripts/`: This directory contains scripts that are shared across multiple examples for tasks such as packaging, deployment, and initialization.
  - `make-extension-lvm` and `make-extension-ubi`: Scripts to package the extension for LVM or UBI volumes.
  - `pkg-dev.sh`: Main packaging script. Calls the appropriate packaging script and zips the output.

### Example Extensions

#### hello_world-js-extension

A simple JavaScript application that prints "Hello World!" to the BrightSign device and broadcasts it as a UDP message. This example is ideal for beginners and demonstrates the basic structure and setup required for a JavaScript-based extension.

[README.md](./examples/hello_world-js-extension/README.md)

#### time_publisher-cpp-extension

A C++ extension that periodically broadcasts the current time as a UDP message. This example requires building of the SDK and is suitable for developers looking to build more advanced or performance-critical extensions using C++.

[README.md](./examples/time_publisher-cpp-extension/README.md)

## Next Steps

Once you have your development extension working as expected, you may wish to proceed to the following topics:

### Submit Extension for Signing

Contact your Partner Engineer for information about submitting your extension for signing.  Once signed, the extension will be returned to you as a `.bsfw` file that can be applied to a production (secure) player by adding the file the SD card.  The extension will be installed on reboot.

### Restoring the Player State

Consult the [Documentation page](https://docs.brightsign.biz/space/DOC/1936916598/Factory+Reset+a+Player) for methods to reset the player. A full hard factory reset (2-button approach) is recommended as the best way to establish a known starting point.

## Licensing

This project is released under the terms of the [Apache 2.0 License](./LICENSE.txt).