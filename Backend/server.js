const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());

const isFolderWritable = async (folderPath) => {
  return new Promise((resolve, reject) => {
    fs.access(folderPath, fs.constants.W_OK, (err) => {
      if (err) {
        reject(new Error("Folder is not writable"));
      } else {
        resolve(true);
      }
    });
  });
};

app.post("/api/extract", async (req, res) => {
  const { link, startInSeconds, endInSeconds, folderPath } = req.body;
  console.log(
    `Received request for video: ${link} from ${startInSeconds} to ${endInSeconds}`
  );
  console.log(`Download folder path: ${folderPath}`);

  try {
    await isFolderWritable(folderPath);
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Error checking folder permissions: ${error.message}` });
  }

  try {
    const videoId = link.split("v=")[1].split("&")[0];
    const segmentPath = path.join(folderPath, `${videoId}_segment.mp4`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    }

    const ytDlpCommand = `yt-dlp -f "137+140" -o - "${link}"`;
    const ffmpegCommand = `ffmpeg -i pipe:0 -ss ${startInSeconds} -to ${endInSeconds} -c copy "${segmentPath}"`;

    console.log(`Executing yt-dlp command: ${ytDlpCommand}`);
    console.log(`Executing ffmpeg command: ${ffmpegCommand}`);

    const ytDlpProcess = spawn("yt-dlp", ["-f", "136+140", "-o", "-", link]);
    const ffmpegProcess = spawn("ffmpeg", [
      "-i",
      "pipe:0",
      "-ss",
      startInSeconds,
      "-to",
      endInSeconds,
      "-c",
      "copy",
      segmentPath,
    ]);

    ytDlpProcess.stdout.pipe(ffmpegProcess.stdin);

    ytDlpProcess.stderr.on("data", (data) => {
      console.error(`yt-dlp stderr: ${data}`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`yt-dlp stderr: ${data}`);
        }
      });
    });

    ffmpegProcess.stderr.on("data", (data) => {
      console.error(`ffmpeg stderr: ${data}`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`ffmpeg stderr: ${data}`);
        }
      });
    });

    ffmpegProcess.on("error", (error) => {
      console.error(`Error during ffmpeg processing: ${error.message}`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`Error during ffmpeg processing: ${error.message}`);
        }
      });
      res
        .status(500)
        .json({ error: `Error during ffmpeg processing: ${error.message}` });
    });

    ffmpegProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`Segment created: ${segmentPath}`);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(`Download complete: ${segmentPath}`);
          }
        });
        res.json({ downloadLink: `/downloads/${videoId}_segment.mp4` });
      } else {
        console.error(`ffmpeg process exited with code ${code}`);
        res
          .status(500)
          .json({ error: `ffmpeg process exited with code ${code}` });
      }
    });
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.use("/downloads", express.static(path.join(__dirname, "downloads")));

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
