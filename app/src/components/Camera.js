import React, { useState, useRef, useEffect, Fragment } from 'react';
import Measure from 'react-measure';
import { useUserMedia } from '../hooks/useUserMedia';
import { useCardRatio } from '../hooks/useCardRatio';
import { useOffsets } from '../hooks/useOffsets';
import {
  Video,
  Canvas,
  Wrapper,
  Container,
  Flash,
  Overlay,
  Button
} from '../styles';

const CAPTURE_OPTIONS = {
  audio: false,
  video: { facingMode: "environment" }
};

export const Camera = ({ onCapture, onClear }) => {
  const canvasRef = useRef();
  const videoRef = useRef();

  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isBlurry, setBlurry] = useState(false);
  const [isGlare, setGlare] = useState(false);

  const [laplace, setLaplace] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);

  const mediaStream = useUserMedia(CAPTURE_OPTIONS);
  const [aspectRatio, calculateRatio] = useCardRatio(1.586);
  const offsets = useOffsets(
    videoRef.current && videoRef.current.videoWidth,
    videoRef.current && videoRef.current.videoHeight,
    container.width,
    container.height
  );

  if (mediaStream && videoRef.current && !videoRef.current.srcObject) {
    videoRef.current.srcObject = mediaStream;
  }

  const handleResize = (contentRect) => {
    setContainer({
      width: contentRect.bounds.width,
      height: Math.round(contentRect.bounds.width / aspectRatio)
    });
  }

  const handleCanPlay = () => {
    calculateRatio(videoRef.current.videoHeight, videoRef.current.videoWidth);
    setIsVideoPlaying(true);
    videoRef.current.play();
  }

  const handleCapture = () => {
    const context = canvasRef.current.getContext("2d");

    context.drawImage(
      videoRef.current,
      offsets.x,
      offsets.y,
      container.width,
      container.height,
      0,
      0,
      container.width,
      container.height
    );

    canvasRef.current.toBlob(blob => onCapture(blob), "image/jpeg", 1);
    setIsCanvasEmpty(false);
    setIsFlashing(true);
  }

  const handleClear = () => {
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsCanvasEmpty(true);
    onClear();
  }
  
  useEffect(() => {
    const CV = window.cv;
    let timer;

    if ((!isVideoPlaying && !videoRef.current) || !isCanvasEmpty) return clearTimeout(timer);

    const delay = 250;
    const blurThreshold = 2;
    const minValThreshold = 10;
    const maxValThreshold = 250;
    // The radius that we plan on applying Gaussian Blur
    const size = new CV.Size(19, 19)

    // Let OpenCV know where our video source is (webcam)
    const capture = new CV.VideoCapture(videoRef.current);
    // Create Mat with same properties as video source
    // CV_8UC4 stands for unsigned 8-bit (8U) with 4 color channels (C4) 
    let frame = new CV.Mat(videoRef.current.videoHeight, videoRef.current.videoWidth, CV.CV_8UC4);

    const processVideo = () => {
        // Initialize Mat, a primitive OpenCV data structure
        // that's basically a multi-dimensional dense array
        // for each of our image pre-processing outputs
        let grayscale = new CV.Mat();
        let laplacian = new CV.Mat();
        let blurred = new CV.Mat();
        // Mostly used as an image container in our case

        // Reads the current frame and updates
        capture.read(frame);

        // Apply Gaussian Blur to frame, outputs to blurred
        CV.GaussianBlur(frame, blurred, size, 0);
        // Converts blurred to grayscale, outputs to grayscale
        // COLOR_BGR2GRAY converts between RGB/BGR and grayscale
        CV.cvtColor(blurred, grayscale, CV.COLOR_BGR2GRAY);

        // Applies Laplacian to grayscale image, outputs to laplacian
        // The image created will be CV_64F (shorthand for CV_64FC1)
        // Single color element with 1 channel (64F)
        CV.Laplacian(grayscale, laplacian, CV.CV_64F);

        let mean = new CV.Mat();
        let stdDev = new CV.Mat();
        // meanStdDev used to calculate deviation in laplacian image
        CV.meanStdDev(laplacian, mean, stdDev);
        // Here we calculate our variance
        const variance = Math.pow(stdDev.doubleAt(0, 0), 2);

        // Find least brightest region (minVal) and brightest region (maxVal)
        const { minVal, maxVal } = CV.minMaxLoc(grayscale);
        setLaplace(variance);
        setMin(minVal);
        setMax(maxVal);

        if (variance < blurThreshold) {
            setBlurry(true);
        } else {
            setBlurry(false);
        }

        if (maxVal >= maxValThreshold && minVal >= minValThreshold) {
            setGlare(true);
        } else {
            setGlare(false);
        }

        // Have to delete all Mat arrays or there'll be trouble
        grayscale.delete();
        laplacian.delete();
        blurred.delete();
        mean.delete();
        stdDev.delete();
    }

    timer = setInterval(processVideo, delay);

    return () => {
      clearTimeout(timer);
    }
  }, [isVideoPlaying, isCanvasEmpty])

  if (!mediaStream) {
    return null;
  }

  return (
    <Measure bounds onResize={handleResize}>
      {({ measureRef }) => (
        <Wrapper>
          <Container
            ref={measureRef}
            maxHeight={videoRef.current && videoRef.current.videoHeight}
            maxWidth={videoRef.current && videoRef.current.videoWidth}
            style={{
              height: `${container.height}px`
            }}
          >
            <Video
              ref={videoRef}
              hidden={!isVideoPlaying}
              onCanPlay={handleCanPlay}
              autoPlay
              playsInline
              muted
              width={videoRef.current ? videoRef.current.videoWidth : 0}
              height={videoRef.current ? videoRef.current.videoHeight : 0}
              style={{
                top: `-${offsets.y}px`,
                left: `-${offsets.x}px`
              }}
            />

            <Overlay hidden={!isVideoPlaying} />

            <Canvas
              ref={canvasRef}
              width={container.width}
              height={container.height}
            />

            <Flash
              flash={isFlashing}
              onAnimationEnd={() => setIsFlashing(false)}
            />
          </Container>

          {isVideoPlaying && (
            <Fragment>
              <div style={{ marginTop: '24px' }}>Laplace: {laplace.toFixed(2)}</div>
              <div>MinVal: {min}</div>
              <div>MaxVal: {max}</div>

              {isBlurry && <div>Image is currently blurry</div>}
              {isGlare && <div>Image currently has glare</div>}

              <Button onClick={isCanvasEmpty ? handleCapture : handleClear} disabled={isBlurry || isGlare}>
              {isCanvasEmpty ? "Take a picture" : "Take another picture"}
              </Button>
            </Fragment>
          )}
        </Wrapper>
      )}
    </Measure>
  );
}
