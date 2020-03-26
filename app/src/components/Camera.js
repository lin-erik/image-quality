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
    if (!isVideoPlaying && !videoRef.current) return;

    const CV = window.cv;
    let timer;

    if (!isCanvasEmpty) return clearTimeout(timer);

    const capture = new CV.VideoCapture(videoRef.current);
    let frame = new CV.Mat(videoRef.current.videoHeight, videoRef.current.videoWidth, CV.CV_8UC4);
    capture.read(frame);

    const processVideo = () => {
      let gray = new CV.Mat();
      let laplacian = new CV.Mat();
      let blurred = new CV.Mat();

      capture.read(frame);

      CV.cvtColor(frame, gray, CV.COLOR_BGR2GRAY);
      CV.Laplacian(gray, laplacian, CV.CV_64F);

      let mean = new CV.Mat();
      let stdDev = new CV.Mat();
      CV.meanStdDev(laplacian, mean, stdDev);
      const deviation = Math.pow(stdDev.doubleAt(0, 0), 2);

      const size = new CV.Size(19, 19)
      CV.GaussianBlur(gray, blurred, size, 0);

      const { minVal, maxVal } = CV.minMaxLoc(blurred);
      setLaplace(deviation);
      setMin(minVal);
      setMax(maxVal);

      if (deviation < 100) {
        setBlurry(true);
      } else {
        setBlurry(false);
      }

      if (maxVal >= 250 && minVal >= 10) {
        setGlare(true);
      } else {
        setGlare(false);
      }

      let delay = 500;
      timer = setTimeout(processVideo, delay);
    }

    processVideo();

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
