import path from 'path';
import fs from 'fs';
import express from 'express';
import { app } from './server/app';

const PORT = parseInt(process.env.PORT || '3000', 10);

// In production, serve dist folder if built
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CarePulse Clinical System running on port ${PORT}`);
});
