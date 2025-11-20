// MRZ OCR modul
export function initMRZOCR(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("MRZ OCR: Container not found");
        return;
    }

    // Vytvoření HTML struktury
    container.innerHTML = `
        <button id="mrz-shareBtn">Sdílet obrazovku</button>
        <div id="mrz-holder" style="position:relative; display:inline-block; margin-top:20px;">
            <video id="mrz-video" autoplay style="max-width:100%; border:2px solid #333;"></video>
            <div id="mrz-selection" style="position:absolute; border:2px dashed red; pointer-events:none;"></div>
        </div>
        <canvas id="mrz-canvas" style="display:none;"></canvas>
        <pre id="mrz-output" style="white-space:pre; background:#fff; padding:10px; border:1px solid #ccc; margin-top:10px;"></pre>
    `;

    // Přidání Tesseract.js
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js";
    script.onload = () => console.log("Tesseract.js loaded");
    document.head.appendChild(script);

    const video = container.querySelector("#mrz-video");
    const canvas = container.querySelector("#mrz-canvas");
    const output = container.querySelector("#mrz-output");
    const selection = container.querySelector("#mrz-selection");
    let stream;

    container.querySelector("#mrz-shareBtn").onclick = async () => {
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            video.srcObject = stream;
            output.textContent = "Sdílení obrazovky aktivní, vyber oblast pro OCR...";
        } catch (err) {
            console.error(err);
            output.textContent = "Chyba při sdílení obrazovky: " + err.message;
        }
    };

    let selecting = false;
    let startX, startY, endX, endY;

    const holder = container.querySelector("#mrz-holder");

    holder.addEventListener("mousedown", e => {
        if (!stream) return;
        const rect = video.getBoundingClientRect();
        selecting = true;
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        selection.style.left = startX + "px";
        selection.style.top = startY + "px";
        selection.style.width = "0px";
        selection.style.height = "0px";
    });

    holder.addEventListener("mousemove", e => {
        if (!selecting) return;
        const rect = video.getBoundingClientRect();
        endX = e.clientX - rect.left;
        endY = e.clientY - rect.top;
        selection.style.left = Math.min(startX, endX) + "px";
        selection.style.top = Math.min(startY, endY) + "px";
        selection.style.width = Math.abs(endX - startX) + "px";
        selection.style.height = Math.abs(endY - startY) + "px";
    });

    holder.addEventListener("mouseup", async () => {
        if (!stream || !selecting) return;
        selecting = false;

        const sx = Math.min(startX, endX);
        const sy = Math.min(startY, endY);
        const sw = Math.abs(endX - startX);
        const sh = Math.abs(endY - startY);

        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");

        await new Promise(r => setTimeout(r, 50));
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

        output.textContent = "Probíhá OCR…";

        try {
            const result = await Tesseract.recognize(
                canvas,
                'mrz',
                {
                    langPath: 'https://dominik9g.github.io/mrz-ocr/',
                    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
                    logger: m => console.log(m)
                }
            );

            output.textContent = result.data.text;
        } catch (err) {
            console.error(err);
            output.textContent = "Chyba při OCR: " + err.message;
        }
    });
}
