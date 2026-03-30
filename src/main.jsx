import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider, theme } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#10b981', // Forest Green
          colorBgBase: '#000000',   // Pure Dark Mode
          fontFamily: 'Inter, sans-serif',
          borderRadius: 4,
          colorLink: '#10b981',
        },
        components: {
          Button: {
            colorPrimary: '#10b981',
            colorPrimaryHover: '#059669',
            controlHeight: 45,
            fontWeight: 600,
          },
          Table: {
            colorBgContainer: '#0a0a0a',
          },
          Card: {
            colorBgContainer: '#0a0a0a',
          }
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
