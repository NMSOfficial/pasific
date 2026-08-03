import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './state/ThemeContext';
import { AuthProvider } from './state/AuthContext';
import { AppRoutes } from './app/AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
