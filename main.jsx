import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    return this.state.error ? <main className="fatal-error"><h1>Something interrupted this demo.</h1><p>Reload the page to reopen your workspace.</p><button className="button primary" onClick={() => window.location.reload()}>Reload workspace</button><details><summary>Error details</summary><pre>{this.state.error.message}</pre></details></main> : this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
