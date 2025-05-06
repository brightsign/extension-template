# Building Extensions for BrightSign Players

Version 1.0
May 2025

## Background

BrightSign offers a mechanism to extend the functionality of their players and operating systems to supply data and code that can be executed on the player. While scattered pieces of internal documentation exist, I could not find a document that described the overall process nor one that gave steps or a how-to.  The reader should find that information in this document. It is not a substitute for the other documents, rather it is a unifying document and one that could be partially redacted and provided to a partner who might be interested in building an extension.

## Internal BrightSign References

The reader should be familiar with these resources.  The remainder of this document will assume the information from these documents.

1. Firmware Extensions
- Description of the BrightSign OS, noting security and reliability issues and how the extension mechanism affords the partner access to that system
- Just as players are Secure (production) or In(Un)-secure, extensions have slightly different mechanisms for insecure (development) and production players where the extension must be signed by BrightSign. This document describes that process

2. BrightSign Getting Started
- How to setup a development host (x86 architecture). External parties should mostly be concerned with the "Preparing your build machine" section and ensuring the relevant packages are installed. An improvement here would be a Dockerfile that can be used to build. If build errors occur, one common cause is a missing package.

3. Player Preparation
- Un-Securing a player, setting up serial monitoring, etc.

## Extension Lifecycle

For the purposes of this document, an Extension is a package that installs code and/or data onto a BrightSign player and causes that code/data to execute or otherwise become available on a running player. As a practical example, this document will assume that the extension delivers some form of Linux daemon that is to start automatically on player boot. There may be many other possible uses for extensions.

The player runs the OS out of NVRAM. This includes any extensions. Therefore, extensions must be installed on the player and not just on external storage. An installed extension becomes available after reboot. On production (secure) players, this installation is done by the OS processing a signed `.bsfw` file on startup. 

While developing, the extension is installed with a script which is created as part of the packaging process. The developer will transfer the extension package and execute the install script in a shell on the player (see Player Preparation). As with production, the extension will become available after reboot.

Extensions must be named. This name is used a few times in the installation and control scripts. Installed extensions are stored in `/var/volatile/bsext` with a directory for each extension, matching the name. Thus my_awesome_extension is stored in `/var/volatile/bsext/my_awesome_extension`.

On startup, the control script `/var/volatile/bsext/${extension_name}/bsext_init`is invoked with a parameter of `start`. This is a SysV style init script. As such it may also be called with `stop` or `run`. Typically, this script will use the `start-stop-daemon` program to launch the extension functionality in a new (daemon) process.

## Anatomy of an Extension
A packaged extension (signed or unsigned) is a squashfs archive of a directory tree created by the developer. As such, it can have any files. As noted above, the `bsext_init` control script is required and must be at the root of this tree. The structure and content of the remainder of the tree is up to the developer. The installation process described above will expand the squashfs to `/var/volatile/bsext/${extension_name}`.

The developer should anticipate that the extension could be relocated anywhere in the filesystem and should either dynamically discover paths or use relative paths.

The process of squashing the developers extension directory and creating the installation script is handled by a BrightSign provided script such as ` make-example-extension-lvm`

## Developing the Extension
BrightSign OS is built using the OpenEmbedded (OE) build system  bitbake (aka Yocto) from common open source linux packages cross-compiled for the target player. Extensions that contain binary executables need to be compatible with the target run-time system (that is, glibc version, libraries, etc.). Of course, the extension can supply any additional libraries or modules, but must take responsibility for configuration or making them accessible. Recall that the production filesystem is read-only, so to use an extension provided library, the extension should provide that library (or so) as part of its squashed tree and set LD_LIBRARY_PATH (or other mechanism) appropriately.

The typical OE mechanism to cross-compile and build binaries for the target is known as the Platform SDK. BrightSign does not typically provide this SDK. However, in compliance with Open Source licenses, BrightSign does make the Yocto source tree available and the SDK can be built from that tree.

The recommended development process is:

1. Prepare the player (unsecure it)
2. Prepare a computer to build the SDK and cross compile the extension
3. Download the BrightSign Open Source Release (follow the readme, download both tarballs)
4. Build the SDK
5. Build your extension using the SDK and test on the unsecure player
6. Submit extension for signing

### Build the SDK

Once built an SDK can be reused for many projects, but should generally be refreshed when targeting a new OS release. SDKs are also platform specific, so cross builds may need to be done multiple times and the varying binaries included in the extension with the `bsext_init` script (or a called script) selecting the appropriate binary at runtime for the platform.

On a build system prepared as above:

1. Open the Open Source Release page and find the target OS release version. Click on the readme for that version and review any information there.
2. Download the two files - *-src-dl.tar.gz and *-src-oe.tar.gz
3. Create a directory for the build -- `mkdir �p ~/bsoe` and change to that directory.
4. Expand both tarballs into the directory just created -- `tar zxvf *-dl.tar.gz && tar zxvf *-oe.tar.gz`
5. Disable or remove any virtual environments like `venv`, `pyenv�, �nvm` or `conda`
a. Long paths can cause build problems in bitbake (which will create a bunch of very long paths itself). These virtual environments typically work by adding very long paths to the front of the shell�s path.
b. These can usually just be disabled either by command -- `conda deactivate` or by commenting out the relevant PATH insertions in your .bashrc file
c. There are many mechanisms � consult the doc for your package.
6. Change to the build directory � e.g. `cd ~/bsoe/build` and run the build command 
a. Consult the readme for the correct build command � typically `MACHINE=cobra ./bsbb brightsign-source-release-world`
b. This will build the entire system and may take up to several hours depending on the speed of your build system.
7. Address and repair any build errors. Common problems include 
a. Long paths
b. Missing system packages
c. Insufficient number of file handles - this can be increased with `ulimit �n 8192` or similar 
d. Insufficient disk space
e. Trying to write to unusual directories like `/srv`
i. It is usually easiest to create these if needed
8. Once building cleanly build the SDK by changing the target to `brightsign-sdk`
a. `MACHINE=cobra ./bsbb brightsign-sdk`
9. Locate the SDK installer in `build/tmp-glibc/deploy/sdk/*.sh` and save it.

### Using packages not in the SDK
The SDK contains a targeted set of libraries, headers, packages, and the cross-platform toolchain. However, your extension may require additional libraries or packages. There are two options�build the components with the SDK or add the component to the SDK by modifying the `bsoe` source tree. Additionally, the developer can choose to static link or dynamic link to the libraries. These are choices for the developer. Here are some common options.

### Package in BrightSign OS, but not SDK
For packages that may be in the BrightSign OS but not exported to the SDK, the package can be added by modifying the sdk recipe in `bsoe/meta-bs/recipes-open/brightsign-sdk/brightsign-sdk.bb`.  Append the desired package to the TOOLCHAIN_TARGET_TASK. 
The addition of `cmake` to the SDK can also be helpful as this will create the necessary toolchain file to cross compile other packages with the SDK.
TOOLCHAIN_TARGET_TASK += "\
libstdc++ \
cmake \
libmicrohttpd \
"

In this example, `libmicrohttpd`, which is already part of BSOS is exported to the SDK. This allows building extensions that use this library and the so already present and not have to build it directly and ship duplicate or incompatible binaries.

### Package not in BSOS, but hard to build with SDK
 For example, this adds opencv to the SDK
TOOLCHAIN_TARGET_TASK += "\
libstdc++ \
opencv \
"

In this case, opencv is added to the SDK. This takes advantage of building OpenCV in the yocto tree.  While OpenCV is not part of the standard BSOS build, it is significantly easier to build in the Yocto tree rather than try to build it stand alone with the SDK.  Of course, the OpenCV recipe must also be added to `meta-bs/recipes-open`.

It may be beneficial to export several packages and create a sort of personal SDK.  However, take care to include any libraries NOT present in the base OS with your SDK.

## Compatibility Considerations
The limited exports of the default brightsign-sdk is by design, stripping down to just the base glibc. This will, generally, maximize compatibility of your extension with OS releases. Linking to specific .sos and libraries from the OS could prove to be fragile when those versions are updated.  

However, building and exporting the components can be generally safe if the extension includes the libraries and configures properly to use the versions included. Building from the Yocto tree is generally simpler and more reliable than trying to replicate a cross platform build later.








