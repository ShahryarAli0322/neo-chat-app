import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import ChatProvider from './Context/ChatProvider';
// Optional: Customize theme if you want
const theme = extendTheme({});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  
  <BrowserRouter>
    <ChatProvider>
      <ChakraProvider theme={theme}>
      <App />
      </ChakraProvider>
      </ChatProvider>
    </BrowserRouter>

);
