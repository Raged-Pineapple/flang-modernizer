const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const IS_WINDOWS = process.platform === 'win32';

app.post('/api/analyze', (req, res) => {
  const { files } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid files array' });
  }

  const tempDirName = `flang-modernizer-${uuidv4()}`;
  const tempDirPath = path.join(os.tmpdir(), tempDirName);

  try {
    fs.mkdirSync(tempDirPath, { recursive: true });

    const filePaths = [];
    files.forEach(f => {
      const safeName = path.basename(f.name);
      const filePath = path.join(tempDirPath, safeName);
      fs.writeFileSync(filePath, f.content, 'utf8');
      filePaths.push(filePath);
    });

    let execCmd = '';
    let execArgs = [];

    if (IS_WINDOWS) {
      // Translate Windows paths to WSL paths (e.g. C:\Temp\file.f -> /mnt/c/Temp/file.f)
      const wslPaths = filePaths.map(p => {
        return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`);
      });
      execCmd = 'wsl';
      execArgs = [
        '-d', 'Ubuntu',
        '-e', '/home/dell/flang-modernizer/build/tools/flang-modernizer/flang-modernizer',
        ...wslPaths
      ];
    } else {
      // Native Linux execution
      execCmd = '/home/dell/flang-modernizer/build/tools/flang-modernizer/flang-modernizer';
      execArgs = filePaths;
    }

    execFile(execCmd, execArgs, { timeout: 8000 }, (error, stdout, stderr) => {
      // Clean up the temporary files
      try {
        fs.rmSync(tempDirPath, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Failed to clean up temp directory:', cleanupErr);
      }

      if (error && error.code === 'ENOENT') {
        return res.status(500).json({
          error: `Executable/command '${execCmd}' not found.`
        });
      }

      res.json({
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? error.code : 0
      });
    });

  } catch (err) {
    try {
      if (fs.existsSync(tempDirPath)) {
        fs.rmSync(tempDirPath, { recursive: true, force: true });
      }
    } catch (_) {}

    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Flang Modernizer API Server running on port ${PORT}`);
  console.log(`Environment: ${IS_WINDOWS ? 'Windows (Bridging to WSL)' : 'Native Linux'}`);
});
