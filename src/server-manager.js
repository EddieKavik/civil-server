const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

class ServerManager {
    constructor() {
        this.configPath = path.join(os.homedir(), '.config', 'civil-server.json');
        this.pidPath = path.join(os.homedir(), '.cache', 'civil-server.pid');
        this.config = this.loadConfig();
        this.currentProcess = null;
    }

    loadConfig() {
        const defaultConfig = {
            port: "4567",
            command: "node src/test-server.js",
            directory: path.resolve(__dirname, '..')
        };

        if (fs.existsSync(this.configPath)) {
            try {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const parsed = JSON.parse(configData);
                return {
                    port: (parsed.port && parsed.port.trim() !== "") ? parsed.port : defaultConfig.port,
                    command: (parsed.command && parsed.command.trim() !== "") ? parsed.command : defaultConfig.command,
                    directory: (parsed.directory && parsed.directory.trim() !== "") ? path.resolve(parsed.directory) : defaultConfig.directory
                };
            } catch (error) {
                console.log('Error parsing config, using defaults:', error.message);
            }
        }

        return defaultConfig;
    }

    saveConfig() {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.log('Error saving config:', error.message);
        }
    }

    async isPortInUse(port) {
        return new Promise((resolve) => {
            const lsof = spawn('lsof', ['-t', '-i', `:${port}`, '-sTCP:LISTEN']);
            let output = '';

            lsof.stdout.on('data', (data) => {
                output += data.toString();
            });

            lsof.on('close', (code) => {
                resolve(code === 0 && output.trim() !== '');
            });
        });
    }

    async startServer() {
        if (this.currentProcess && !this.currentProcess.killed) {
            return { success: false, message: 'Server is already running' };
        }

        const port = this.config.port;
        const cmd = this.config.command;
        const dir = path.resolve(this.config.directory); // Ensure absolute

        console.log(`DEBUG: Attempting to start server`);
        console.log(`DEBUG: Port: ${port}`);
        console.log(`DEBUG: Command: ${cmd}`);
        console.log(`DEBUG: Directory: ${dir}`);
        console.log(`DEBUG: Directory exists: ${fs.existsSync(dir)}`);

        // Check if directory exists
        if (!fs.existsSync(dir)) {
            console.log(`DEBUG ERROR: Directory does not exist: ${dir}`);
            return { success: false, message: `Directory does not exist: ${dir}` };
        }

        // Check if port is in use
        const portInUse = await this.isPortInUse(port);
        if (portInUse) {
            return { success: false, message: `Port ${port} is already in use` };
        }

        try {
            console.log(`Starting server with command: ${cmd} in directory: ${dir}`);
            
            // Start the server process
            this.currentProcess = spawn(cmd, [], {
                shell: true,
                cwd: dir,
                detached: false, // Keep attached so we can monitor it
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Handle process output
            this.currentProcess.stdout.on('data', (data) => {
                console.log(`Server stdout: ${data}`);
            });

            this.currentProcess.stderr.on('data', (data) => {
                console.log(`Server stderr: ${data}`);
            });

            this.currentProcess.on('close', (code) => {
                console.log(`Server process exited with code ${code}`);
                this.currentProcess = null;
                // Clean up PID file
                if (fs.existsSync(this.pidPath)) {
                    try {
                        fs.unlinkSync(this.pidPath);
                    } catch (error) {
                        console.log('Error cleaning up PID file:', error.message);
                    }
                }
            });

            // Save PID
            const pidDir = path.dirname(this.pidPath);
            if (!fs.existsSync(pidDir)) {
                fs.mkdirSync(pidDir, { recursive: true });
            }
            fs.writeFileSync(this.pidPath, this.currentProcess.pid.toString());

            // Give it a moment to start
            await new Promise(resolve => setTimeout(resolve, 100));

            return { success: true, message: `Server started on port ${port}` };
        } catch (error) {
            console.log('Error starting server:', error);
            return { success: false, message: `Failed to start server: ${error.message}` };
        }
    }

    stopServer() {
        let stopped = false;

        // First try to stop current process if it exists
        if (this.currentProcess && !this.currentProcess.killed) {
            try {
                console.log(`Stopping current process with PID: ${this.currentProcess.pid}`);
                this.currentProcess.kill('SIGTERM');
                this.currentProcess = null;
                stopped = true;
            } catch (error) {
                console.log('Error stopping current process:', error.message);
            }
        }

        // Also check PID file and stop any process listed there
        if (fs.existsSync(this.pidPath)) {
            try {
                const pid = parseInt(fs.readFileSync(this.pidPath, 'utf8').trim());
                if (pid) {
                    console.log(`Stopping process from PID file: ${pid}`);
                    process.kill(pid, 'SIGTERM');
                    stopped = true;
                }
            } catch (error) {
                console.log('Error stopping server from PID file:', error.message);
            }
            
            // Always remove PID file when stopping
            try {
                fs.unlinkSync(this.pidPath);
            } catch (error) {
                console.log('Error removing PID file:', error.message);
            }
        }

        if (stopped) {
            return { success: true, message: 'Server stopped' };
        } else {
            return { success: false, message: 'No server was running' };
        }
    }

    getServerStatus() {
        // Check current process first
        if (this.currentProcess && !this.currentProcess.killed) {
            return `Running on ${this.config.port}`;
        }

        // Check PID file
        if (fs.existsSync(this.pidPath)) {
            try {
                const pid = parseInt(fs.readFileSync(this.pidPath, 'utf8').trim());
                if (pid) {
                    // Check if process is still running by sending signal 0
                    process.kill(pid, 0);
                    return `Running on ${this.config.port}`;
                }
            } catch (error) {
                // Process not running, clean up PID file
                try {
                    fs.unlinkSync(this.pidPath);
                } catch (unlinkError) {
                    // Ignore unlink errors
                }
            }
        }

        return 'Status: Stopped';
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        // Reload config from file to ensure consistency
        this.config = this.loadConfig();
    }
}

module.exports = ServerManager;
