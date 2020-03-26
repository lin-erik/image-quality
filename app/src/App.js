import React, { Fragment, useState } from 'react';
import { Camera } from './components/Camera';
import { Root, Preview, Footer, GlobalStyle, Button } from './styles';
import Axios from 'axios';

const App = () => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cardImage, setCardImage] = useState();

  const fetchMetrics = async () => {
    console.log(cardImage);

    const data = new FormData();
    data.append('data', cardImage, `image.png`);

    const response = await Axios.post('/metrics', data);

    console.log(response);
  }

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