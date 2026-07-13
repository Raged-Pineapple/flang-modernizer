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

  console.log(`[${new Date().toISOString()}] POST /api/analyze - Received ${files.length} file(s)`);
  files.forEach(f => console.log(`  - File: ${f.name} (${f.content ? f.content.length : 0} chars)`));

  if (!files || !Array.isArray(files) || files.length === 0) {
    console.warn('  Invalid request: empty or missing files array');
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

    console.log(`  Running command: ${execCmd} ${execArgs.join(' ')}`);

    execFile(execCmd, execArgs, { timeout: 8000 }, (error, stdout, stderr) => {
      console.log(`  Execution completed. Exit Code: ${error ? (error.code || 1) : 0}`);
      console.log(`  Stdout length: ${stdout ? stdout.length : 0}`);
      console.log(`  Stderr length: ${stderr ? stderr.length : 0}`);

      // Clean up the temporary files
      try {
        fs.rmSync(tempDirPath, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Failed to clean up temp directory:', cleanupErr);
      }

      if (error && error.code === 'ENOENT') {
        console.error(`  Command '${execCmd}' not found.`);
        return res.status(500).json({
          error: `Executable/command '${execCmd}' not found.`
        });
      }

      res.json({
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? (error.code || 1) : 0
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

const simpleGit = require('simple-git');

// Helper to recursively find Fortran files
const walkDirectory = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== '.git' && file !== 'node_modules' && file !== 'build') {
        walkDirectory(filePath, fileList);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.f', '.f90', '.f77', '.for', '.f95', '.f03', '.f08'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
};

app.get('/api/analyze-github', async (req, res) => {
  const { repoUrl } = req.query;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const sendProgress = (type, message, data = null) => {
    res.write(`data: ${JSON.stringify({ type, message, data })}\n\n`);
  };

  if (!repoUrl) {
    sendProgress('error', 'Missing repoUrl query parameter');
    return res.end();
  }

  console.log(`[${new Date().toISOString()}] GET /api/analyze-github - Target: ${repoUrl}`);
  sendProgress('progress', `Verifying remote repository existence: ${repoUrl}`);

  // 1. Verify repo exists in WSL
  execFile('wsl', ['-d', 'Ubuntu', '-e', 'git', 'ls-remote', repoUrl], (verifErr) => {
    if (verifErr) {
      console.error('Verification failed:', verifErr.message);
      sendProgress('error', `Repository verification failed. Please check that the URL is correct and public.`);
      return res.end();
    }

    sendProgress('progress', 'Repository verified successfully.');

    const tempDirName = `flang-git-${uuidv4()}`;
    const wslTempDirPath = `/tmp/${tempDirName}`;

    // 2. Clone in WSL
    sendProgress('progress', 'Cloning remote repository in WSL (shallow depth=1)...');
    execFile('wsl', ['-d', 'Ubuntu', '-e', 'git', 'clone', '--depth', '1', repoUrl, wslTempDirPath], (cloneErr) => {
      if (cloneErr) {
        console.error('Clone failed:', cloneErr.message);
        sendProgress('error', `Git clone failed inside WSL: ${cloneErr.message}`);
        return res.end();
      }

      sendProgress('progress', 'Cloning complete. Scanning for Fortran files in WSL...');

      // 3. Find files recursively in WSL
      execFile('wsl', ['-d', 'Ubuntu', '-e', 'find', wslTempDirPath, '-type', 'f'], (findErr, findStdout) => {
        if (findErr) {
          console.error('Find failed:', findErr.message);
          sendProgress('error', `Failed to scan files in WSL: ${findErr.message}`);
          execFile('wsl', ['-d', 'Ubuntu', '-e', 'rm', '-rf', wslTempDirPath]);
          return res.end();
        }

        const lines = findStdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const wslPaths = lines.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.f', '.f90', '.f77', '.for', '.f95', '.f03', '.f08'].includes(ext);
        });

        if (wslPaths.length === 0) {
          sendProgress('error', 'No Fortran source files found in this repository.');
          execFile('wsl', ['-d', 'Ubuntu', '-e', 'rm', '-rf', wslTempDirPath]);
          return res.end();
        }

        sendProgress('progress', `Discovered ${wslPaths.length} Fortran file(s):`);
        wslPaths.forEach(fp => {
          sendProgress('file_found', path.relative(wslTempDirPath, fp).replace(/\\/g, '/'));
        });

        // 4. Run compiler in WSL
        sendProgress('progress', 'Starting compiler static analysis on translation units...');
        const compilerBinary = '/home/dell/flang-modernizer/build/tools/flang-modernizer/flang-modernizer';
        
        console.log(`  Running remote WSL analysis on ${wslPaths.length} files`);
        
        execFile('wsl', [
          '-d', 'Ubuntu',
          '-e', compilerBinary,
          ...wslPaths
        ], { timeout: 25000 }, (compilerErr, stdout, stderr) => {
          console.log(`  Execution completed. Exit Code: ${compilerErr ? (compilerErr.code || 1) : 0}`);

          // 5. Clean up temp folder in WSL
          execFile('wsl', ['-d', 'Ubuntu', '-e', 'rm', '-rf', wslTempDirPath], (rmErr) => {
            if (rmErr) console.error('WSL Cleanup failed:', rmErr.message);
          });

          if (compilerErr && compilerErr.code === 'ENOENT') {
            sendProgress('error', 'Compiler binary not found in WSL.');
            return res.end();
          }

          // Strip absolute WSL paths out of stdout for clean display
          const cleanedStdout = stdout 
            ? stdout.replaceAll(wslTempDirPath, '') 
            : '';
          const baseNames = wslPaths.map(fp => path.basename(fp));

          sendProgress('complete', 'Analysis complete.', {
            stdout: cleanedStdout || '',
            stderr: stderr || '',
            files: baseNames
          });
          res.end();
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Flang Modernizer API Server running on port ${PORT}`);
  console.log(`Environment: ${IS_WINDOWS ? 'Windows (Bridging to WSL)' : 'Native Linux'}`);
});
