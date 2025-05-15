# Building Extensions for BrightSign Players

_A Workshop_

Version 1.0
May 2025

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
2. Built a personal, cross-compilation SDK you can use for this and future extension projects. If your needs for this SDK change or you wish to update for a future OS release, you can return back to this guide to adapt and rebuild your SDK
3. Built a small, sample extension that publishes the current time over UDP by using the SDK you built
4. an Understanding of the Lifecycle of Extension and how to package Extensions for development
5. Information about submitting your Extension for approval/signing by BrightSign
6. Learnt how to re-secure an un-secure player

## Requirements

To complete this workshop, you will need:

* a development host with an **x86 architecture CPU** and running **Linux**
* a BrightSign Player running OS v 9.x or later (extensions are supported on earlier releases, but this workshop was only tested with 9.x)
* serial cabling to connect the player's serial port to the development host

### (Recommended) Docker

A Dockerfile is provided to build the SDK and its use is recommended.

**[Install](https://docs.docker.com/engine/install/) Docker** and ensure it functions properly.

If you do not wish to use Docker, consult the `Dockerfile` for the build system requirements.

### (Optional) Convenience

May of the command blocks that follow in the file can be executed as "Notebook" cells when using the VS Code extension "RunME".  They can also, of course, be copied and pasted. To facilitate reproducibility, defining a environment variable is convenient to help orient working directories and will be used in the shell blocks.  Use of this environment variable is optional, but very helpful.

```bash
# make sure the current working directory is the root of the cloned project
export project_root=$(pwd)
```

## Step 1 - Un-Secure the Player for Development

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

**Do not proceed until all the above are functional**

## Step 2 - Build a personal SDK for cross-compilation

BrightSign OS is built using the OpenEmbedded (OE) build system  bitbake (aka Yocto) from common open source linux packages cross-compiled for the target player. Extensions that contain binary executables need to be compatible with the target run-time system (that is, glibc version, libraries, etc.). Of course, the extension can supply any additional libraries or modules, but must take responsibility for configuration or making them accessible. The production filesystem is read-only, so to use an extension provided library, the extension should provide that library (or `so`) as part of its squashed tree and set LD_LIBRARY_PATH (or other mechanism) appropriately.

The typical OE mechanism to cross-compile and build binaries for the target is known as the Platform SDK or the OE SDK. BrightSign does not typically provide this SDK. However, in compliance with Open Source licenses, BrightSign does make the Yocto source tree available and the SDK can be built from that tree using the standard build tool `bitbake` as wrapped by the brightsign script `bsbb`.

### Build the SDK - with Docker

As there are a large number of package dependencies, building with Docker is recommended.  To build the SDK with the Dockerfile, first make any recipe modifications (see below).

Proceed to build the container.

```bash
cd ${project_root:-.}

# build the container -- mapping current user
docker build --rm --build-arg USER_ID=$(id -u) --build-arg GROUP_ID=$(id -g) -t bsoe-build .
```

Continue to fetch the release bundles.

1. Open the [Open Source Release](https://docs.brightsign.biz/releases/brightsign-open-source) page and find the target OS release version. Click on the readme for that version and review any information there.
2. Download the two files - `*-src-dl.tar.gz` and `*-src-oe.tar.gz` to the `project_root`
3. Expand both tarballs

```bash
cd ${project_root:-.}

tar zxvf *-dl.tar.gz && tar zxvf *-oe.tar.gz
```

   this will create a `brightsign-oe` directory in the current directory

Run the container with an interactive terminal

```sh
cd ${project_root:-.}

mkdir -p srv
# the build process puts some output in srv

docker run -it --rm \
  -v $(pwd):/home/builder/bsoe -v $(pwd)/srv:/srv \
  bsoe-build
```

From the container shell you just launched, build the full release.

```sh
cd /home/builder/bsoe/build

MACHINE=cobra ./bsbb brightsign-source-release-world
# This will build the entire system and may take up to several hours depending on the speed of your build system.
```

Address and repair any build errors. Common problems include

   a. Long paths

   b. Missing system packages

   c. Insufficient number of file handles - this can be increased with `ulimit -n 8192` or similar

   d. Insufficient disk space

   e. Trying to write to unusual directories like `/srv`. It is usually easiest to create these if needed

Once building cleanly, build the SDK by changing the target to `brightsign-sdk`

```sh
cd /home/builder/bsoe/build

MACHINE=cobra ./bsbb brightsign-sdk`
```

If the build is successful, exit the container shell and copy the built SDK to the project root.

```sh
# The SDK installer is in `brightsign-oe/build/tmp-glibc/deploy/sdk/*.sh`

cd ${project_root:-.}

cp brightsign-oe/build/tmp-glibc/deploy/sdk/*.sh ${project_root:-.}
```

### Using packages not in the SDK

The SDK contains a targeted set of libraries, headers, packages, and the cross-platform toolchain. However, your extension may require additional libraries or packages. There are two options: build the components with the SDK or add the component to the SDK by modifying the `brightsign-oe` source tree. Additionally, the developer can choose to static link or dynamic link to the libraries. These are choices for the developer. Here are some common options.

___To continue with this workshop, no additional exports to the SDK are needed___

Continue to Step 3 -- Build a Sample Extension or continue to read about other considerations for building and bundling library code.

#### Package in BrightSign OS, but not SDK

For packages that may be in the BrightSign OS but not exported to the SDK, the package can be added by modifying the sdk recipe in `brightsign-oe/meta-bs/recipes-open/brightsign-sdk/brightsign-sdk.bb`.  Append the desired package to the `TOOLCHAIN_TARGET_TASK`.

For example, to add `libmicrohttpd`, which is already part of BSOS is exported to the SDK. Modify `brightsign-sdk-.bb` to expose this library with:

```sh
TOOLCHAIN_TARGET_TASK += "  
libstdc++  
libmicrohttpd  
"
```

#### Package not in BSOS, but hard to build with SDK

Some packages can be troublesome to build outside of the Yocto tree. OpenCV is one such package due to the large number of dependencies. To build a package and expose it in the SDK with bitbake:

1. Add a recipe to the build tree for the package such as `meta-bs/recipes-open/opencv`
2. add that package to the SDK target as above.

___ALWAYS INCLUDE THE LIBRARIES IN YOUR EXTENSION___

It may be beneficial to export several packages and create a sort of personal SDK.  However, take care to include any libraries NOT present in the base OS with your SDK.

Once built an SDK can be reused for many projects, but should generally be refreshed when targeting a new OS release. SDKs are also platform specific, so cross builds may need to be done multiple times and the varying binaries included in the extension with the `bsext_init` script (or a called script) selecting the appropriate binary at runtime for the platform.

### Compatibility Considerations

The limited exports of the default brightsign-sdk is by design, stripping down to just the base glibc. This will, generally, maximize compatibility of your extension with OS releases. Linking to specific `.so`s and libraries from the OS could prove to be fragile when those versions are updated.

However, building and exporting the components can be generally safe if the extension includes the libraries and configures properly to use the versions included. Building from the Yocto tree is generally simpler and more reliable than trying to replicate a cross platform build later.

### Validation

You should now have a personal SDK -- something like `brightsign-x86_64-cobra-toolchain-9.0.189.sh`.

```sh
cd ${project_root:-.}

ls brightsign-x86_64-*-toolchain-*.sh
#brightsign-x86_64-cobra-toolchain-9.0.189.sh
```

Finally, **Install** the SDK into the current project by running the script.

```sh
cd ${project_root:-.}

# the exact name of your SDK install script may be different
./brightsign-x86_64-cobra-toolchain-9.0.189.sh  -d ./sdk -y
# installs the sdk to ./sdk

# optional -- clean up the `brightsign-oe` tree
#rm -rf brightsign-oe
```

__NB:__ the SDK must be _`source`d_ into the current shell whenever used. This must be repeated everytime a new shell is opened.

Removing the built SDK installer is not recommended as you may wish to use it on future projects.

```sh
cd ${project_root:-.}

source ./sdk/environment-setup-aarch64-oe-linux 
```

## Step 3 - Build Sample Extension

In this step, you will build a small C++ program that will publish the current time to a UDP port and learn about how to deploy and do basic debugging on the player.  We will start by building and testing on the development host, then building the program for the target player.

### Native Build on Host

Let's start with a native build on the development host to test the code.

**Start from a new shell where the SDK enviornment has NOT been sourced**

```sh
# start a new shell
#bash

cd ${project_root:-.}

#rm -rf build_native
mkdir -p build_native && cd $_

cmake ..
make
```

Test the code by starting `time_publisher` in one shell and opening another to print the UDP messages (timestamps).

```sh
# run the program in the FIRST TERMINAL
cd ${project_root:-.}/build_native

./time_publisher
```

```sh
# in a SECOND TERMINAL
socat -u UDP-LISTEN:5005 -
```

Open a **THIRD** terminal and test the signal handling, which is important for Extensions

```sh
# now a THIRD TERMINAL
kill $(pgrep time_publisher)
```

__Verfify__ the publisher is stopped, that `socat` stops printing times and that the `kill` returned without errors.  _You will need to shutdown `socat` manually.

_Optional_: `rm -rf ${project_root:-}/build_native`

It is generally easier to debug, unit test, and generally validate the program before building the Extension and deploying to the player.

### Cross-Platform Build for Player

Now you will use the OE SDK to build the `time_publisher` for the BrightSign Player.

**Remember to `source` the environment when starting a new shell**

```sh
cd ${project_root:-.}
source sdk/environment-setup-aarch64-oe-linux 

#rm -rf build_bsos
mkdir -p build_bsos && cd $_
cmake ..
make

cmake --install .
```

The `time_publisher` binary has now been copied to an `install` directory in the project root. While our simple project does not rely on any additional libraries or files, adding them to the _install_ target in `CMakeLists.txt` is straightforward.

#### Test program on the player

You will now package the install directory, copy it to the player, unpack and test the program.

```sh {"promptEnv":"never"}
cd ${project_root:-.}

rm -f time_publisher-*.zip
cd install 
zip -r ../time_publisher-$(date +%s).zip *
```

Use [DWS](https://docs.brightsign.biz/space/DOC/370673541/Diagnostic+Web+Server+(DWS)+Overview#SD-(Storage)) or other mechanism to copy (upload) the zip file to the player.

Open an SSH connection to the player and drop to the Linux shell. (`Ctl-c, exit, exit` to get to `#` prompt.)

```sh
# files uploade by the DWS are in `/storage/sd' on the player.  
#  (Some players have a different path -- notably `/storage/usb1` is common)

cd /usr/local
# /usr/local is writable and executable by all users, but not persistent
# (i.e. it will be wiped on reboot).  So we need to copy the files

export latest=$(ls -t /storage/sd/time_publisher-*.zip | head -n 1)
unzip ${latest} -o -d /usr/local/

# clean up the zip files
#rm -r /storage/sd/time_publisher-*.zip
```

**Test the time publisher**

Since we only have one ssh session, `time_publisher` can be launched and backgrounded. If you wanted to test the program in the context of a BrightScript or node presentation, `nuhup` can also be used to allow the process to run once the current ssh session is terminated.

```sh
cd /usr/local

./time_publisher &
# Broadcasting time to 127.0.0.1:5005

# inspect the process table for the time_publisher
ps  | grep time_publisher
#16406 root      4148 S    ./time_publisher
#16410 root      2528 S    grep time_publisher

# verify the time_publisher is running with socat
socat -u UDP-LISTEN:5005 -
#2025-05-08T00:04:11Z
#2025-05-08T00:04:12Z
#2025-05-08T00:04:13Z
#2025-05-08T00:04:14Z
# Ctrl-C to stop the output

# now kill the time_publisher
kill $(pidof time_publisher)

# verify the time_publisher is no longer running
ps  | grep time_publisher
#16434 root      2528 S    grep time_publisher
```

### Validation

If the `time_publisher` ran successfully on the player, then the cross platform SDK and toolchain has been validated.

You now know how to develop and test programs locally and then retarget and test them on a player.

## Step 4 - Extension Lifecycle and Packaging

### Extension Lifecycle

The player runs the OS out of NVRAM. Therefore, extensions must be installed on the player and not just on external storage. An installed extension becomes available after reboot. On production (secure) players, this installation is done by the OS processing a signed `.bsfw` file on startup.

While developing, the extension is installed with a script which is created as part of the packaging process. The developer will transfer the extension package and execute the install script in a shell on the player (see Player Preparation). As with production, the extension will become available after reboot.

Extensions must be named. This name is used a few times in the installation and control scripts. Installed extensions are stored in `/var/volatile/bsext` with a directory for each extension, matching the name. Thus our `time_publisher` extension is stored in `/var/volatile/bsext/time_publisher`.

On startup, the control script `/var/volatile/bsext/${extension_name}/bsext_init`is invoked with a parameter of `start`. This is a SysV style init script. As such it may also be called with `stop` or `run`. Typically, this script will use the `start-stop-daemon` program to launch the extension functionality in a new (daemon) process.

### Anatomy of an Extension

A packaged extension (signed or unsigned) is a squashfs archive of a directory tree created by the developer. As such, it can have any files. As noted above, the `bsext_init` control script is required and must be at the root of this tree. The structure and content of the remainder of the tree is up to the developer. The installation process described above will expand the squashfs to `/var/volatile/bsext/${extension_name}`.

The developer should anticipate that the extension could be relocated anywhere in the filesystem and should either dynamically discover paths or use relative paths.

The process of squashing the developers extension directory and creating the installation script is handled by a BrightSign provided script such as `make-example-extension-lvm` or `make-example-extension-ubi`.

### Init scripts

In __Step 3__, you built and validated the `time_publisher` program to run on the player. You will add the control scripts for the program.

__Open__ the file [`sh/bsext_init`](sh/bsext_init) and inspect the flow. You will note the extension name is referenced a few times, but otherwise this should be a familiar SysV style init script. Pay attention to the INIT INFO block at the top of the file and modify the service name, descriptions, requirements, and defaults as needed for any future extensions.

Also note that this script takes a parameter of [`start`|`stop`|`restart`|`run`]. Additionally, the helper `start-stop-daemon` is used for lifecycle control. If you choose to modify the `bsext_init` script, take case as the `start-stop-daemon` will retain the PID of the daemon process for later `stop`ping.  If you were to invoke a script or make some other call, take care to ensure that the PIDs are tracked or can be reliably unwound on `stop`.

You may wish to extend this script and/or the functions within it to do things like

* use a registry key to disable the script (helpful for debugging)
* change the port for the UDP message

#### Run v Start

The key difference between invoking `bsext_init` with `run` vs `start` is the backgrounding of the daemon.  When developing an extension, it is very easy to put the player into a crashing and continual rebooting state. Using a registry key to disable the `start` of the extension, can prove to be a real time saver.  Alternatively, a factory reset will remove the extension.

When developing, it is recommended to set just such a `disable` key to prevent the `start` method from running.  The extension can then be tested manually with `bsext_init run` or even by removing the disable key.  If the player ends up in a crash loop, the registry can be written from boot prompt.  (Use `Ctl-C` at boot to get to the prompt.)

The command `cmake --install .` you executed earlier from the `build_bsos` directory copied these scripts to the `install` directory.

Now that you have the skill to build the binary, package and transfer the zip archive, try using the `start-ext.sh` script to start your program.  __Then__ proceed to use the `bsext_init` script to start and stop the service (`bsext_init start` and `bsext_init stop`).  This script will start/stop the program as a daemon, so you can try it out in your presentation as well.

**Test the init script.**

```sh
# Test the time_publisher from the init script

cd /usr/local

# run time_publisher in the foreground
./bsext_init run
# Running time_publisher in foreground
# Starting time_publisher in foreground
# Broadcasting time to 127.0.0.1:5005

# stop the time_publisher with Ctl-C
# ^CCaught signal 2, shutting down...
# Exporter shutdown complete

# run time_publisher in the background
./bsext_init start
# Starting time_publisher
# changing to /usr/local and execing ./bsext_init
# Starting time_publisher in background

# check the process table for the time_publisher
ps  | grep time_publisher
# 16406 root      4148 S    ./time_publisher
# 16410 root      2528 S    grep time_publisher
# verify the time_publisher is running with socat
socat -u UDP-LISTEN:5005 -
# 2025-05-08T00:04:11Z
# 2025-05-08T00:04:12Z

# stop the time_publisher
./bsext_init stop
# Stopping time_publisher
# stopped process in pidfile '/var/run/time_publisher.pid' (pid 23636)

# check the process table for the time_publisher
ps  | grep time_publisher
# 16410 root      2528 S    grep time_publisher

```

### Package the Extension for Development

If you can successfully start and stop your program using `bsext_init` and it runs while the presentation is active, then proceed to build an development package and install the extension.

**Open** and inspect the [`make-extension-lvm`](./sh/make-extension-lvm) and [`make-extension-ubi`](./sh/make-extension-ubi). In particular you may need to set the `name` to match your extension name.

Package the extension.

```sh
cd ${project_root:-.}

sh/pkg-dev.sh install lvm
```

Transfer the most recent zip file to the player as you did before.

___Is DWS Unresponsive to upload a file?___

This can happen when the BrightScript process is stopped such as when you in an active SSH session.  To re-activate DWS, restart the BrightScript process in your ssh session by exiting the Linux prompt with `Ctl-D`.

Connect an ssh session to the player and drop to the Linux shell.

```sh
# in the player ssh linux shell
cd /usr/local
# clean up any leftovers
#rm -rf *

export latest=$(ls -t /storage/sd/time_publisher-*.zip | head -n 1)
unzip ${latest} -o -d /usr/local/

# install the extension
bash ./ext_time_pub_install-lvm.sh

# the extension will be installed on reboot
reboot
```

### Validation

If you have a presentation that consumes the UDP messages, are they accurate?

If you do not have a presentation, connect ssh and drop the Linux shell and validate that `time_publisher` is running

```sh
# on the player ssh linux shell
ps  | grep time_publisher
#16406 root      4148 S    ./time_publisher
#16410 root      2528 S    grep time_publisher

socat -u UDP-LISTEN:5005 -
# 2025-05-13T18:16:01Z
# 2025-05-13T18:16:02Z

# check the pid
cat /var/run/time_publisher.pid
#16406
# they should be the same
```

## Step 5 - Submit Extension for Signing

Contact your Partner Engineer for information about submitting your extension for signing.  Once signed, the extension will be returned to you as a `.bsfw` file that can be applied to a production (secure) player by adding the file the SD card.  The extension will be installed on reboot.

## Step 6 - Restoring the Player State

Consult the [Documentation page](https://docs.brightsign.biz/space/DOC/1936916598/Factory+Reset+a+Player) for methods to reset the player. A full factory reset is recommended as the best way to establish a known starting point.

### Uninstalling the Extension

1. Connect to the player over SSH and drop to the Linux shell.
2. STOP the extension -- e.g. `/var/volatile/bsext/ext_time_pub/bsext_init stop`
3. VERIFY all the processes for your extension have stopped. (Can use the `ps`, `socat`, and other commands used previously.)
4. Unmount the extension filesystem and remove it from BOTH the `/var/volatile` filesystem AND the `/dev/mapper` filesystem.

Following the outline given by the `make-extension` script.

```sh
# EXAMPLE USAGE -- CUSTOMIZE THIS FOR YOUR EXTENSION

# stop the extension
/var/volatile/bsext/ext_time_pub/bsext_init stop

# check that all the processes are stopped
# ps | grep ext_time_publisher

# unmount the extension
umount /var/volatile/bsext/ext_time_pub
# remove the extension
rm -rf /var/volatile/bsext/ext_time_pub

# remove the extension from the system
lvremove --yes /dev/mapper/bsos-ext_time_pub
rm -rf /dev/mapper/bsos-ext_time_pub

reboot
```








