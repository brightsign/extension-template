# Hello World JS Extension

This guide explains how to create a dev BrightSign extension from a JavaScript application using the provided scripts in this project.

## Project Structure

- `src/*`: Main JavaScript application files.
- `player-app/*`: Example UDP listener application for testing the extension output. Not part of the extension itself.
- `bsext_init`: Init script to start/stop the extension on the device.
- `webpack.config.js`: Bundles the JS app and copies the init script.
- `package.json`: Project metadata and build scripts.

## How the Extension Works

- The JS app waits for BrightSign JS APIs to load, then sends a UDP message every few seconds (configurable) with device info and timestamp.
- The init script - `bsext_init` - launches the JS app, passing the UDP port as an environment variable.
- Packaging scripts create a SquashFS image and install scripts for deployment.

## Creating a Dev Extension from a JS App

### 1. Prepare Your JS Application

- Place your main JS code in `src/index.js`.
- Ensure it uses environment variables for configuration (e.g., `PORT`).
- Edit the timeout values at the top of the file as needed.

### 2. Build the Application

- Navigate to the extension directory:
    ```bash
    cd examples/hello_world-js-extension
    ```
- Run `yarn install` to install dependencies.
- Run `yarn build` to bundle the JS app (output in `install/`).

### 3. Package the Extension

- Use the packaging script to create a deployable zip:
  ```bash
  yarn package-lvm      # for LVM volume
  yarn package-ubi      # for UBI volume
  ```

- This creates a zip file (e.g., `hello_world-<timestamp>.zip`) containing the packaged extension.

### 4. Deploy to Device

- Copy the zip file to the root of the SD card on your BrightSign player.

### 5. Run the extension on the player

#### Prerequisites (Un-Secure the Player for Development)

- Follow the steps as provided in this section of the main [README.md](../../README.md#un-secure-the-player-for-development).

#### (Optional) Convenience

To facilitate reproducibility, defining a environment variable is convenient to help orient working directories and will be used in the shell blocks. Use of this environment variable is optional, but very helpful.

```bash
# make sure the current working directory is the examples/hello_world-js-extension directory
export project_root=$(pwd)
```

#### Steps to Run the Extension

1. Connect to the player via Serial connection or Telnet/SSH.
2. Break into the Linux shell.
   
     * `Ctrl-C` in the Serial / Telnet / SSH session to get to the debugger
     * type `exit` to get to the BrightSign Intpreter
     * type `exit` again to access the Linux shell

3. Once in the Linux shell, follow the steps below to run the extension:
    ```sh
    # in the player Linux shell
    cd /usr/local
    
    # clean up any leftovers
    #rm -rf *

    export latest=$(ls -t /storage/sd/hello_world-*.zip | head -n 1)
    unzip ${latest} -o -d /usr/local/

    # install the extension
    bash ./ext_hello_world_install-lvm.sh

    # the extension will be installed on reboot
    reboot
    ```
4. After reboot, the extension should start automatically.

### 6. Testing the Extension
- Copy the `autorun.brs` and `listener.js` files from `player-app` folder to the root of the SD card.
- Reboot the player.
- You should start seeing UDP messages from the extension printed in the serial log.

---

For more details, see comments in each script and the source files or refer to the main [README.md](../../README.md) file.
