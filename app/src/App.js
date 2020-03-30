import React, { Fragment, useState, useEffect } from 'react';
import { Camera } from './components/Camera';
import { Root, Preview, Footer, GlobalStyle, Button } from './styles';
import Axios from 'axios';

const App = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cardImage, setCardImage] = useState();

  const [laplace, setLaplace] = useState(0);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);

  const fetchMetrics = async () => {
    const form = new FormData();
    form.append('data', cardImage, `image.png`);

    const { data } = await Axios.post('/metrics', form);
    setLaplace(data.laplacian);
    setMin(data.minVal);
    setMax(data.maxVal);
  }

  useEffect(() => {
    if (!cardImage) {
      setLaplace(0);
      setMin(0);
      setMax(0);
    }
  }, [cardImage])

  return (
    <Fragment>
      <Root>
        {isCameraOpen && (
          <Camera
            onCapture={blob => setCardImage(blob)}
            onClear={() => setCardImage(undefined)}
          />
        )}

        {cardImage && (
          <div>
            <h2>Preview</h2>
            <Preview src={cardImage && URL.createObjectURL(cardImage)} />

            {Boolean(laplace) && <div style={{ marginTop: '24px' }}>Laplace: {laplace}</div>}
            {Boolean(min) && <div>MinVal: {min}</div>}
            {Boolean(max) && <div>MaxVal: {max}</div>}

            <Button onClick={fetchMetrics}>Send to API for Metrics</Button>
          </div>
        )}

        <Footer>
          <button onClick={() => setIsCameraOpen(true)}>Open Camera</button>
          <button
            onClick={() => {
              setIsCameraOpen(false);
              setCardImage(undefined);
            }}
          >
            Close Camera
          </button>
        </Footer>
      </Root>

      <GlobalStyle />
    </Fragment>
  );
}

export default App;