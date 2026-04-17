const slint = require("slint-ui");
const ServerManager = require("./server-manager");

// Create server manager instance
const serverManager = new ServerManager();

// Create a new component instance
const { MainWindow } = slint.loadFile(__dirname + "/ui.slint");
const { AboutDialog } = slint.loadFile(__dirname + "/about-dialog.slint");
const { ConfigDialog } = slint.loadFile(__dirname + "/config-dialog.slint");

// Create the main window instance
const mainWindow = new MainWindow();

// Initialize status
const initialStatus = serverManager.getServerStatus();
mainWindow.statusText = initialStatus;
mainWindow.statusColor = initialStatus.includes("Running") ? "#27ae60" : "#e74c3c";

// Handle all callbacks
mainWindow.quit = () => {
    console.log("Quit button clicked");
    slint.quitEventLoop();
    process.exit(0);
};

mainWindow.startServer = async () => {
    console.log("Start Server button clicked");
    
    // Update UI immediately to show starting
    mainWindow.statusText = "Starting...";
    mainWindow.statusColor = "#f39c12"; // Orange for starting
    
    const result = await serverManager.startServer();
    console.log(result.message);
    
    // Update status to show actual server state
    const newStatus = serverManager.getServerStatus();
    mainWindow.statusText = newStatus;
    mainWindow.statusColor = newStatus.includes("Running") ? "#27ae60" : "#e74c3c"; // Green for running, red for stopped
    
    if (result.success) {
        console.log("✅ Server started successfully");
    } else {
        console.log("❌ Server failed to start:", result.message);
    }
};

mainWindow.stopServer = () => {
    console.log("Stop Server button clicked");
    
    // Update UI immediately to show stopping
    mainWindow.statusText = "Stopping...";
    
    const result = serverManager.stopServer();
    console.log(result.message);
    
    // Update status to show actual server state
    const newStatus = serverManager.getServerStatus();
    mainWindow.statusText = newStatus;
    
    if (result.success) {
        console.log("✅ Server stopped successfully");
    } else {
        console.log("❌ Server failed to stop:", result.message);
    }
};

mainWindow.syncSessions = async () => {
    console.log("Sync Sessions button clicked");
    
    const currentStatus = serverManager.getServerStatus();
    console.log("Current status:", currentStatus);
    
    if (currentStatus.includes("Running")) {
        console.log("Server is running, performing sync...");
        
        // Stop the server
        const stopResult = serverManager.stopServer();
        console.log("Stop result:", stopResult.message);
        mainWindow.statusText = "Syncing...";
        
        // Wait a moment for clean shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Restart the server
        const startResult = await serverManager.startServer();
        console.log("Start result:", startResult.message);
        mainWindow.statusText = serverManager.getServerStatus();
        
        if (startResult.success) {
            console.log("✅ Sync completed successfully");
        } else {
            console.log("❌ Sync failed:", startResult.message);
        }
    } else {
        console.log("No server running to sync - starting server first");
        const startResult = await serverManager.startServer();
        console.log("Start result:", startResult.message);
        mainWindow.statusText = serverManager.getServerStatus();
    }
};

mainWindow.about = () => {
    console.log("About button clicked");
    
    // Create and show about dialog
    const aboutDialog = new AboutDialog();
    aboutDialog.closeDialog = () => {
        // Hide the dialog - in Slint we can set visibility or destroy the instance
        aboutDialog.hide();
    };
    aboutDialog.show();
};

mainWindow.configuration = async () => {
    console.log("Configuration button clicked");
    
    // Create and show configuration dialog
    const configDialog = new ConfigDialog();
    
    // Set properties using camelCase
    configDialog.portText = serverManager.config.port;
    configDialog.commandText = serverManager.config.command;
    configDialog.directoryText = serverManager.config.directory;
    
    configDialog.saveConfig = async (port, command, directory) => {
        console.log(`DEBUG: Saving config from UI`);
        console.log(`DEBUG: port type: ${typeof port}, value: "${port}"`);
        console.log(`DEBUG: command type: ${typeof command}, value: "${command}"`);
        console.log(`DEBUG: directory type: ${typeof directory}, value: "${directory}"`);
        serverManager.updateConfig({ port, command, directory });
        
        // Check if server is running and restart it with new config
        const currentStatus = serverManager.getServerStatus();
        console.log(`DEBUG: Current server status: ${currentStatus}`);
        if (currentStatus.includes("Running")) {
            console.log("DEBUG: Server is running, restarting with new config...");
            
            // Stop the server
            const stopResult = serverManager.stopServer();
            console.log("DEBUG: Stop result:", stopResult.message);
            
            // Wait a moment for clean shutdown
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Restart the server
            const startResult = await serverManager.startServer();
            console.log("DEBUG: Start result:", startResult.message);
            
            // Update UI status
            mainWindow.statusText = serverManager.getServerStatus();
            mainWindow.statusColor = mainWindow.statusText.includes("Running") ? "#27ae60" : "#e74c3c";
        } else {
            console.log("DEBUG: Server is not running, no restart needed");
        }
    };
    
    configDialog.closeDialog = () => {
        configDialog.hide();
    };
    
    configDialog.show();
};

// Show the window
mainWindow.show();

// Run the event loop
slint.runEventLoop();