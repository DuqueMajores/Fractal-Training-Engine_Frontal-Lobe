import express from "express";
import path from "path";
import fs from "fs";
import { execFile, spawn } from "child_process";
import { createServer as createViteServer } from "vite";

const PKL_PATH = path.join(process.cwd(), "memória_fracta.pkl");

function importPkl(filepath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      ["pickle_helper.py", "import", filepath],
      { env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        try {
          const data = JSON.parse(stdout.trim());
          if (data.error) {
            const err = new Error(data.error);
            (err as any).code = data.code;
            return reject(err);
          }
          resolve(data);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}. Stderr: ${stderr}`));
        }
      }
    );
  });
}

function exportPkl(filepath: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["pickle_helper.py", "export", filepath], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });
    let stdout = "";
    let stderr = "";
    
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
      try {
        const res = JSON.parse(stdout.trim());
        if (res.error) {
          return reject(new Error(res.error));
        }
        resolve();
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}. Stderr: ${stderr}`));
      }
    });
    
    child.stdin.write(JSON.stringify(data));
    child.stdin.end();
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure general parsing
  app.use(express.json({ limit: "50mb" }));

  // API Route: check if memoria file exists and return its state parsed from pickle
  app.get("/api/load-pkl", async (req, res) => {
    try {
      if (!fs.existsSync(PKL_PATH)) {
        return res.status(404).json({ error: "Arquivo memória_fracta.pkl não encontrado no servidor", code: "ENOENT" });
      }
      const data = await importPkl(PKL_PATH);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao ler arquivo .pkl" });
    }
  });

  // API Route: save JSON state into memoria_fracta.pkl
  app.post("/api/save-pkl", async (req, res) => {
    try {
      const data = req.body;
      await exportPkl(PKL_PATH, data);
      res.json({ status: "success", message: "Memória salva com sucesso em memória_fracta.pkl" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao salvar arquivo .pkl" });
    }
  });

  // API Route: upload a custom .pkl file, saving it as memoria_fracta.pkl
  app.post("/api/upload-pkl", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    try {
      const buffer = req.body;
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "Conteúdo do arquivo vazio" });
      }
      fs.writeFileSync(PKL_PATH, buffer);
      
      // Parse the newly uploaded file to verify and return to frontend
      const data = await importPkl(PKL_PATH);
      res.json({ status: "success", data, message: "Arquivo memória_fracta.pkl enviado e processado com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao processar upload do arquivo .pkl" });
    }
  });

  // API Route: download the current memoria_fracta.pkl file
  app.get("/api/download-pkl", (req, res) => {
    if (!fs.existsSync(PKL_PATH)) {
      return res.status(404).json({ error: "Arquivo memória_fracta.pkl não disponível para download" });
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const filename = `LoboFractalMemory-${day}${month}${year}.pkl`;
    
    res.download(PKL_PATH, filename);
  });

  // API Route: delete the current memoria_fracta.pkl file
  app.post("/api/delete-pkl", (req, res) => {
    try {
      if (fs.existsSync(PKL_PATH)) {
        fs.unlinkSync(PKL_PATH);
      }
      res.json({ status: "success", message: "Arquivo memória_fracta.pkl removido com sucesso" });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro ao excluir arquivo .pkl" });
    }
  });

  // Vite development middleware vs Static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
