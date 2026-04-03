const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

class ServerManager {
    constructor() {
        this.configPath = path.join(os.homedir(), ".config", "civil-server.json");
        this.pidPath = path.join(os.homedir(), ".cache", "civil-server.pid");
        this.process = null;
        this.config = this.loadConfig();
    }

    loadConfig() {
        const defaultConfig = {
            port: "4567",
            command: "node src/test-server.js",
            directory: path.resolve(__dirname, ".."),
        };

        if (!fs.existsSync(this.configPath)) return defaultConfig;

        try {
            const raw = fs.readFileSync(this.configPath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                port: typeof parsed.port === "string" && parsed.port.trim() ? parsed.port : defaultConfig.port,
                command: typeof parsed.command === "string" && parsed.command.trim() ? parsed.command : defaultConfig.command,
                directory:
                    typeof parsed.directory === "string" && parsed.directory.trim()
                        ? path.resolve(parsed.directory)
                        : defaultConfig.directory,
            };
        } catch {
            return defaultConfig;
        }
    }

    saveConfig() {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    updateConfig(next) {
        this.config = { ...this.config, ...next };
        this.saveConfig();
    }

    isRunning() {
        if (this.process && !this.process.killed) return true;
        if (!fs.existsSync(this.pidPath)) return false;
        try {
            const pid = parseInt(fs.readFileSync(this.pidPath, "utf8").trim(), 10);
            if (!pid) return false;
            process.kill(pid, 0);
            return true;
        } catch {
            try {
                fs.unlinkSync(this.pidPath);
            } catch {
                // ignore
            }
            return false;
        }
    }

    getStatusText() {
        return this.isRunning() ? `Running on ${this.config.port}` : "Status: Stopped";
    }

    async start() {
        if (this.isRunning()) {
            return { success: false, message: "Server is already running" };
        }

        const cwd = path.resolve(this.config.directory);
        if (!fs.existsSync(cwd)) {
            return { success: false, message: `Directory does not exist: ${cwd}` };
        }

        try {
            this.process = spawn(this.config.command, [], {
                shell: true,
                cwd,
                detached: false,
                stdio: ["ignore", "pipe", "pipe"],
            });

            const pidDir = path.dirname(this.pidPath);
            if (!fs.existsSync(pidDir)) fs.mkdirSync(pidDir, { recursive: true });
            fs.writeFileSync(this.pidPath, String(this.process.pid));

            this.process.stdout.on("data", (d) => console.log(String(d)));
            this.process.stderr.on("data", (d) => console.error(String(d)));

            this.process.on("close", () => {
                this.process = null;
                try {
                    fs.unlinkSync(this.pidPath);
                } catch {
                    // ignore
                }
            });

            return { success: true, message: `Server started on port ${this.config.port}` };
        } catch (e) {
            return { success: false, message: e instanceof Error ? e.message : String(e) };
        }
    }

    stop() {
        let didStop = false;

        if (this.process && !this.process.killed) {
            try {
                this.process.kill("SIGTERM");
                didStop = true;
            } catch {
                // ignore
            }
            this.process = null;
        }

        if (fs.existsSync(this.pidPath)) {
            try {
                const pid = parseInt(fs.readFileSync(this.pidPath, "utf8").trim(), 10);
                if (pid) {
                    process.kill(pid, "SIGTERM");
                    didStop = true;
                }
            } catch {
                // ignore
            }

            try {
                fs.unlinkSync(this.pidPath);
            } catch {
                // ignore
            }
        }

        return didStop ? { success: true, message: "Server stopped" } : { success: false, message: "No server was running" };
    }

    async sync() {
        if (this.isRunning()) {
            this.stop();
            await new Promise((r) => setTimeout(r, 800));
        }
        return this.start();
    }
}

module.exports = ServerManager;
