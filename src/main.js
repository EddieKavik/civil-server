const slint = require("slint-ui");
const ServerManager = require("./server-manager");

const { MainWindow } = slint.loadFile(__dirname + "/ui.slint");
const { AboutDialog } = slint.loadFile(__dirname + "/about-dialog.slint");
const { ConfigDialog } = slint.loadFile(__dirname + "/config-dialog.slint");

const mainWindow = new MainWindow();

const serverManager = new ServerManager();

const refreshStatus = () => {
    const text = serverManager.getStatusText();
    mainWindow.statusText = text;
    mainWindow.statusColor = text.startsWith("Running") ? "#27ae60" : "#000000";
};

refreshStatus();

mainWindow.startServer = () => {
    console.log("Start Server clicked");
    mainWindow.statusText = "Starting...";
    mainWindow.statusColor = "#f39c12";
    serverManager
        .start()
        .then((r) => console.log(r.message))
        .catch((e) => console.error(e))
        .finally(refreshStatus);
};

mainWindow.stopServer = () => {
    console.log("Stop Server clicked");
    mainWindow.statusText = "Stopping...";
    mainWindow.statusColor = "#f39c12";
    const r = serverManager.stop();
    console.log(r.message);
    refreshStatus();
};

mainWindow.syncSessions = () => {
    console.log("Sync Sessions clicked");
    mainWindow.statusText = "Syncing...";
    mainWindow.statusColor = "#f39c12";
    serverManager
        .sync()
        .then((r) => console.log(r.message))
        .catch((e) => console.error(e))
        .finally(refreshStatus);
};

mainWindow.configuration = () => {
    console.log("Configuration clicked");

    const dlg = new ConfigDialog();
    dlg.portText = serverManager.config.port;
    dlg.commandText = serverManager.config.command;
    dlg.directoryText = serverManager.config.directory;

    dlg.saveConfig = (port, command, directory) => {
        serverManager.updateConfig({ port, command, directory });
        refreshStatus();
    };

    dlg.closeDialog = () => {
        dlg.hide();
    };

    dlg.show();
};

mainWindow.about = () => {
    console.log("About clicked");

    const dlg = new AboutDialog();
    dlg.closeDialog = () => {
        dlg.hide();
    };
    dlg.show();
};

mainWindow.quit = () => {
    console.log("Quit clicked");
    slint.quitEventLoop();
    process.exit(0);
};

mainWindow.show();
slint.runEventLoop();
