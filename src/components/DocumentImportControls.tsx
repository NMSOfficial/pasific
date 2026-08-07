import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, FileArchive, Files, Images, Link2, X } from 'lucide-react';
import type { DocumentSourceMode } from '../types/assessment';
import { extractSupportedFilesFromZip, prepareDocumentFiles } from '../utils/documentImport';

interface Props {
  disabled?: boolean;
  onFiles: (files: File[], mode: DocumentSourceMode) => Promise<void> | void;
  onCloudUrl: (url: string) => Promise<void> | void;
}

export function DocumentImportControls({ disabled = false, onFiles, onCloudUrl }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cloudUrl, setCloudUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, cameraOpen]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const pickFiles = async (event: ChangeEvent<HTMLInputElement>, mode: DocumentSourceMode) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      await onFiles(await prepareDocumentFiles(files), mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosyalar hazırlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const pickZip = async (event: ChangeEvent<HTMLInputElement>) => {
    const zip = event.target.files?.[0];
    event.target.value = '';
    if (!zip) return;
    setBusy(true);
    setError(null);
    try {
      const extracted = await extractSupportedFilesFromZip(zip);
      await onFiles(await prepareDocumentFiles(extracted), 'zip');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ZIP açılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const openCamera = async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(media);
      setCameraOpen(true);
    } catch {
      setError('Kamera açılamadı. Tarayıcı kamera iznini kontrol et.');
    }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('camera_canvas_unavailable');
      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('camera_capture_failed');
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onFiles(await prepareDocumentFiles([file]), 'camera');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fotoğraf alınamadı.');
    } finally {
      setBusy(false);
    }
  };

  const importCloud = async () => {
    const url = cloudUrl.trim();
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      await onCloudUrl(url);
      setCloudUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulut belgesi alınamadı.');
    } finally {
      setBusy(false);
    }
  };

  const locked = disabled || busy;

  return (
    <div className="document-import-controls">
      <div className="document-import-actions">
        <button type="button" className="btn btn--secondary" disabled={locked} onClick={openCamera}>
          <Camera size={16} /> Kamera
        </button>
        <label className={`btn btn--secondary ${locked ? 'is-disabled' : ''}`}>
          <Images size={16} /> Galeriden toplu seç
          <input type="file" hidden multiple accept="image/*" disabled={locked} onChange={(event) => pickFiles(event, 'gallery')} />
        </label>
        <label className={`btn btn--secondary ${locked ? 'is-disabled' : ''}`}>
          <Files size={16} /> Fotoğraf / PDF
          <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" disabled={locked} onChange={(event) => pickFiles(event, 'file')} />
        </label>
        <label className={`btn btn--secondary ${locked ? 'is-disabled' : ''}`}>
          <FileArchive size={16} /> ZIP
          <input type="file" hidden accept=".zip,application/zip" disabled={locked} onChange={pickZip} />
        </label>
      </div>

      <div className="document-cloud-row">
        <div className="input-with-action" style={{ flex: 1 }}>
          <input
            className="input-control"
            value={cloudUrl}
            onChange={(event) => setCloudUrl(event.target.value)}
            placeholder="Google Drive, Dropbox veya OneDrive paylaşım bağlantısı"
            disabled={locked}
          />
          <span className="input-with-action__action" style={{ pointerEvents: 'none' }}><Link2 size={16} /></span>
        </div>
        <button type="button" className="btn btn--secondary" disabled={locked || !cloudUrl.trim()} onClick={importCloud}>Bağlantıdan al</button>
      </div>

      {busy && <p className="field__hint">Belge hazırlanıyor…</p>}
      {error && <p className="field__error">{error}</p>}

      {cameraOpen && (
        <div className="camera-capture-modal" role="dialog" aria-modal="true" aria-label="Belge fotoğrafı çek">
          <div className="camera-capture-panel">
            <div className="camera-capture-header">
              <strong>Belgeyi kadraja al</strong>
              <button type="button" className="icon-btn" onClick={closeCamera} aria-label="Kamerayı kapat"><X size={18} /></button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="camera-capture-video" />
            <div className="camera-capture-footer">
              <p className="field__hint">Kağıdın dört köşesini mümkün olduğunca görünür tut ve gölge oluşturmamaya çalış.</p>
              <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={capture}><Camera size={17} /> Fotoğrafı çek ve OCR'a gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
