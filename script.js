window.connectBluetooth = async () => {
    try {
        // This version looks for any device that supports the "Printer" service
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true, // This makes the printer show up in the list
            optionalServices: ['0000ff00-0000-1000-8000-00805f9b34fb'] 
        });
        
        const server = await device.gatt.connect();
        // Standard Generic Access for thermal printers
        const service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
        printCharacteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
        
        alert("Bluetooth Printer Connected! 🖨️");
    } catch (e) { 
        alert("Bluetooth Error: " + e.message); 
        console.log(e);
    }
};
