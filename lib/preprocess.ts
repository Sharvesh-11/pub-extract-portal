export async function preprocessImage(file: File): Promise<Blob> {
  const img = new Image();
  const imgUrl = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imgUrl;
  });
  URL.revokeObjectURL(imgUrl);

  const angle = findDeskewAngle(img);
  
  const canvas = document.createElement('canvas');
  // Expand canvas to safely fit rotated bounds
  const rad = Math.abs(angle * Math.PI / 180);
  const newW = Math.round(Math.abs(img.width * Math.cos(rad)) + Math.abs(img.height * Math.sin(rad)));
  const newH = Math.round(Math.abs(img.width * Math.sin(rad)) + Math.abs(img.height * Math.cos(rad)));
  
  canvas.width = newW;
  canvas.height = newH;
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");
  
  // Fill white background to cover transparent edges caused by rotation
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, newW, newH);
  
  // Rotate around center
  ctx.translate(newW/2, newH/2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.drawImage(img, -img.width/2, -img.height/2);
  ctx.rotate(-angle * Math.PI / 180);
  ctx.translate(-newW/2, -newH/2);
  
  // Apply Otsu Thresholding for extreme contrast (B&W)
  const imgData = ctx.getImageData(0, 0, newW, newH);
  applyOtsu(imgData.data, newW, newH);
  ctx.putImageData(imgData, 0, 0);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, 'image/png');
  });
}

function findDeskewAngle(img: HTMLImageElement): number {
  // Use a downscaled version of the image to speed up analysis
  const maxSize = 400;
  const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
  const sw = Math.round(img.width * scale);
  const sh = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  const cx = sw / 2;
  const cy = sh / 2;
  // Sample only the central 80% area to minimize corner clipping anomalies
  const sampleW = Math.floor(sw * 0.8);
  const sampleH = Math.floor(sh * 0.8);
  
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0;
  
  // Calculate variance of horizontal projection profile (how well text lines align horizontally)
  const getVariance = (angle: number) => {
    ctx.clearRect(0, 0, sampleW, sampleH);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, sampleW, sampleH);

    ctx.save();
    ctx.translate(sampleW/2, sampleH/2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.translate(-cx, -cy); 
    ctx.drawImage(img, 0, 0, sw, sh);
    ctx.restore();
    
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
    const rowSums = new Float64Array(sampleH);
    for (let y = 0; y < sampleH; y++) {
      let sum = 0;
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx+1] + 0.114 * imgData[idx+2];
        sum += (255 - lum); // Invert so text pixels have higher weight
      }
      rowSums[y] = sum;
    }
    
    let mean = 0;
    for (let y = 0; y < sampleH; y++) mean += rowSums[y];
    mean /= sampleH;
    
    let variance = 0;
    for (let y = 0; y < sampleH; y++) variance += Math.pow(rowSums[y] - mean, 2);
    return variance;
  };

  // Coarse sweep +/- 15 degrees
  let bestAngle = 0;
  let maxVar = 0;
  for (let a = -15; a <= 15; a += 1.5) {
    const v = getVariance(a);
    if (v > maxVar) { maxVar = v; bestAngle = a; }
  }
  
  // Fine sweep around best peak
  let refinedBest = bestAngle;
  maxVar = 0;
  for (let a = bestAngle - 1.5; a <= bestAngle + 1.5; a += 0.2) {
    const v = getVariance(a);
    if (v > maxVar) { maxVar = v; refinedBest = a; }
  }

  return refinedBest;
}

function applyOtsu(data: Uint8ClampedArray, width: number, height: number) {
  const hist = new Int32Array(256);
  // Convert to grayscale and build histogram
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = data[i+1] = data[i+2] = gray;
    hist[gray]++;
  }
  
  const total = width * height;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let threshold = 0;
  
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * Math.pow(mB - mF, 2);
    
    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = i;
    }
  }
  
  // Binarize
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] > threshold ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = val;
    // Set alpha safely back to 255
    data[i+3] = 255;
  }
}
