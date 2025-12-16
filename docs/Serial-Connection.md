# Serial Connection from Player to Development Host

Serial communications is used to interrupt the boot cycle and unsecure the player and for many other diagnostic situations. In this guide, you will connect a player to your development host and verify the connection.

## Requirements

* A serial to USB cable or arrangement of adapters suitable for your player and development host.
* A serial monitor program on you development host (tested with picocom on Ubuntu 24.04)

1. Consult [Serial Port Configuration](https://docs.brightsign.biz/advanced/serial-port-configuration) for details and instruction about making the physical connection.  **NB**: some players (LS series) may require an additional adapater.

**Make the physical connection**

2. Verify the connection by checking the tty devices. You should see a device matching your connection.

```bash
# assuming the device connection is a USB adapter, most will show up like this
ls /dev/ttyUSB*
#/dev/ttyUSB0

# other common device enumerations include /dev/ttyACM* and /dev/ttyS*
```

For clarity and convenience, set an environment variable with the device file node:

```bash
# modify to use YOUR device
export player_serial_device=/dev/ttyUSB0
```

3. **POWER OFF THE PLAYER**
4. Monitor the serial port from the player

Using picocom (modify to use the terminal program of your choice)

```bash
picocom -b 115200 ${player_serial_device}
```

Nothing will happen yet as the player is powered off, right?

5. __WHILE HOLDING THE _SVC_ BUTTON__ power ON the player.

You should see something like:
_(details will vary based on your player)_

```jl
Board: chevelle
 (7278 of 7278b1 family)
strap=00000002,0000001d:
otp @ 0x08404030 = 0x03020240: en_cr(0x00000060) en_host_uart(0x00000200) hdcp22_disable(0x02000000) v7_map_sel_src(0x00020000) vmxwatermarking_disable(0x01000000)
otp @ 0x08404034 = 0x00800002: hdcp_disable(0x00000002) macrovision_disable(0x00800000)
otp @ 0x08404520 = 0x0000000f: cwmcwatermarking_disable(0x00000001) dv_hdr_disable(0x00000002) tc_hdr_disable(0x00000004) tc_itm_disable(0x00000008)
bond option: 0x00
RESET CAUSE: AON 0x00000200 software_master (1 of 25 possible causes)
RESET CAUSE: SUNDRY 0x000080 software-master-reset
Images: BFW:1st AVS:1st MEMSYS:1st
CPU 4x B53 [420f1000] 1872 MHz, SCB 486 MHz, SYSIF 1248 MHz
DDR0 @ 1600MHz, DDR1 @ 1600MHz
AVS: park check
AVS: STB: V=0.934V, T=+30.180C, PV=0.875V, MV=0.934V, FW=[2.2.0.0]
AVS: CPU: V=0.991V, T=+30.180C, PV=0.850V, MV=0.994V
Automatic startup in 3 seconds, press Ctrl-C to interrupt.
```

## Congratulations

You have successfully connected your player over serial to your dev host