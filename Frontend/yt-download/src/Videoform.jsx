import { useState } from "react";
import "./VideoForm.css";

const apiPath = "http://localhost:5000/api/extract";

const convertTimeToSeconds = (time) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

export const VideoForm = () => {
  const [link, setLink] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [folderPath, setFolderPath] = useState("C:/Downloads");
  const [status, setStatus] = useState(""); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(""); 

    const startInSeconds = convertTimeToSeconds(startTime);
    const endInSeconds = convertTimeToSeconds(endTime);

    setStatus("DOWNLOADING..."); 

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          link,
          startInSeconds,
          endInSeconds,
          folderPath,
        }),
      });

      const data = await response.json();
      if (data.downloadLink) {
        window.location.href = data.downloadLink;
        setStatus("DONE"); 
      } else {
        setStatus(`Error: ${data.error}`); 
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setStatus("An error occurred."); 
    }
  };

  return (
    <div className="video-form-container">
      <h2>Download YouTube Video Segment</h2>
      <form className="video-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>YouTube Link:</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            required
            placeholder="https://www.youtube.com/watch?v=1234"
          />
        </div>
        <div className="form-group">
          <label>Start Time:</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            pattern="\d{2}:\d{2}:\d{2}"
            required
            placeholder="HH:MM:SS"
          />
        </div>
        <div className="form-group">
          <label>End Time:</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            pattern="\d{2}:\d{2}:\d{2}"
            required
            placeholder="HH:MM:SS"
          />
        </div>
        <div className="form-group">
          <label htmlFor="folderPath">Download Folder Path:</label>
          <input
            type="text"
            id="folderPath"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="C:/Downloads"
          />
        </div>
        <button type="submit" className="submit-button">Download</button>
        <div className="status-message">
          {status}
        </div>
      </form>
    </div>
  );
};
