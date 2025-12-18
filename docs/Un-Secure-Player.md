# Un-Secure a Player

**BrightSign Players as secured and can only run software that has been verified and signed by BrightSign so as to maintain the security of HDCP and other keys as well as to maintain reliability of the players.**

However for development, this is rather inconvenient. Therefore, the security checks on the player can be disabled.

## Pre-Requisites

* The Player is connected to the Development Host as in [Serial-Connection](./Serial-Connection.md)

1. __POWER OFF THE PLAYER__  (_ProTip: A power strip or smart plug device can prove handy for this_)
2. Connect the serial monitor program as in [Serial-Connection](./Serial-Connection.md)
3. **WHILE HOLDING the SVC button** power ON the player

__Quick__, _like a bunny_, hit `Ctl-C` on the serial console.

Do this withing 3 seconds or repeat the process.  Once at a prompt, type:

```sh
console on
reboot
```

This will enable the serial console.

4. After reboot, and within 3 seconds, again type `Ctl-C` on the serial console.

Un-secure the player by typing into the console:

```sh
setenv SECURE_CHECKS 0
env save

# finally, check with 
printenv
# and verify SECURE_CHECKS is set to 0

# finally
reboot
```

5. Verify that the serial console is showing a boot log, which may look something like:

```yaml


U-Boot 2017.09 (BrightSign v9.1.22.1, Feb 28 2025 - 17:28:18 +0000)
BrightSign XT2145 (0x2) BOOTLOADER-VERIFIED BS-INSECURE

Net:   Looking for Ethernet address for 'eth' 0...using address 90:ac:3f:2d:72:0b (BS_ETH0_HWADDR)
eth0: ethernet@fe1b0000
Hit key to stop autoboot('CTRL+C'):  0
Device: mmc@fe2e0000
Manufacturer ID: 15
OEM: 100
Name: 4FTE4
Timing Interface: HS400 Enhanced Strobe
Tran Speed: 200000000
Rd Block Len: 512
MMC version 5.1
High Capacity: Yes
Capacity: 1.8 GiB
Bus Width: 8-bit DDR
Erase Group Size: 512 KiB
HC WP Group Size: 8 MiB
User Capacity: 1.8 GiB ENH WRREL
User Enhanced Start: 0 Bytes
User Enhanced Size: 1.8 GiB
Boot Capacity: 4 MiB ENH
RPMB Capacity: 512 KiB ENH

Loading from mmc device 0, partition 6: Name: kernel  Type: U-Boot
Fit image detected...
   FIT description: U-Boot fitImage for brightsign/9.1.25/cobra
    Image 0 (kernel-1)
     Description:  Linux kernel
     Type:         Kernel Image
     Compression:  gzip compressed
     Data Start:   0x100000f0
     Data Size:    10136400 Bytes = 9.7 MiB
     Architecture: AArch64
```

If it does not, repeat the procedure.

## Enable script debugging

Ensure the registry key `brightscript debug` is set to `1`.  From a command prompt or in DWS

```
registry write brightscript debug 1 
```

This will allow you to type `Ctl-C` in an ssh shell to stop the BrightScript interpretter.

## Congratulations, player is now un-secured and ready for development