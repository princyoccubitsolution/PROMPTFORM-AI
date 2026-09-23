"use client";

import React, { useState } from 'react';
import { Copy, Check, QrCode, Code, ExternalLink, Send, Share2, Mail } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const WhatsAppIcon = ({ className = "w-4 h-4 text-emerald-500" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.78 0-3.522-.479-5.047-1.385l-.362-.214-3.75.983.999-3.657-.235-.374a9.86 9.86 0 01-1.51-5.26c0-5.445 4.43-9.875 9.877-9.875 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c0 5.446-4.431 9.876-9.877 9.876m0-18.066c-6.544 0-11.872 5.327-11.872 11.87 0 2.09.545 4.13 1.58 5.926l-1.68 6.136 6.279-1.647a11.82 11.82 0 005.693 1.458c6.545 0 11.872-5.327 11.872-11.871 0-3.17-1.235-6.15-3.477-8.394-2.242-2.244-5.223-3.478-8.395-3.478z" />
  </svg>
);

const TelegramIcon = ({ className = "w-4 h-4 text-sky-500" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4 text-blue-600" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  formTitle: string;
  uniqueShareId?: string;
  publicUrl?: string;
}

export const ShareModal = ({ isOpen, onClose, formId, formTitle, uniqueShareId, publicUrl }: ShareModalProps) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  // Compute final URL: if uniqueShareId exists, use `/f/{uniqueShareId}`, otherwise `/f/{formId}`
  const shareCode = uniqueShareId || formId;
  const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'https://promptform.ai';
  const finalShareUrl = publicUrl || `${baseUrl}/f/${shareCode}`;

  const shareText = `Please fill out this form: ${formTitle}`;
  const embedCode = `<iframe src="${finalShareUrl}" width="100%" height="700px" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>`;

  // QR Code Image URL (using free standard qrserver api)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(finalShareUrl)}`;

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(finalShareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = finalShareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Could not copy link:", err);
    }
  };

  const handleCopyEmbed = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(embedCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = embedCode;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      console.error("Could not copy embed code:", err);
    }
  };

  const downloadQrCode = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle.replace(/\s+/g, '_')}_qr_code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback: Open in new window
      window.open(qrCodeUrl, '_blank');
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n" + finalShareUrl)}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(finalShareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(finalShareUrl)}`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(formTitle)}&body=${encodeURIComponent(shareText + "\n\n" + finalShareUrl)}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Form" size="md">
      <div className="space-y-6 text-foreground dark:text-zinc-150">
        
        {/* Copy Link Container */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Public Link</label>
          <div className="flex items-center space-x-3 bg-muted dark:bg-zinc-950 border border-border dark:border-border rounded-lg px-3.5 py-2">
            {/* The clickable blue link next to copy */}
            <a 
              href={finalShareUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-mono text-sm text-primary dark:text-primary hover:underline flex-1 truncate break-all font-bold"
              title="Click to visit live form"
            >
              {finalShareUrl}
            </a>
            
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <Button onClick={handleCopyLink} className="space-x-1.5 bg-primary hover:opacity-90 text-primary-foreground border-none cursor-pointer rounded-lg h-8.5 text-xs">
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(finalShareUrl, '_blank')}
                className="p-2 rounded-lg border border-border dark:border-border text-zinc-700 dark:text-zinc-355 dark:hover:bg-zinc-800 cursor-pointer h-8.5 w-8.5 flex items-center justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Share buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">Social Share Channels</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="w-full text-xs font-semibold justify-center py-2 px-3 space-x-2 text-zinc-700 dark:text-zinc-250 dark:hover:bg-zinc-800 border-border dark:border-border cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleTelegram}
              className="w-full text-xs font-semibold justify-center py-2 px-3 space-x-2 text-zinc-700 dark:text-zinc-250 dark:hover:bg-zinc-800 border-border dark:border-border cursor-pointer"
            >
              <TelegramIcon className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <span>Telegram</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleLinkedIn}
              className="w-full text-xs font-semibold justify-center py-2 px-3 space-x-2 text-zinc-700 dark:text-zinc-250 dark:hover:bg-zinc-800 border-border dark:border-border cursor-pointer"
            >
              <LinkedInIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>LinkedIn</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              className="w-full text-xs font-semibold justify-center py-2 px-3 space-x-2 text-zinc-700 dark:text-zinc-250 dark:hover:bg-zinc-800 border-border dark:border-border cursor-pointer"
            >
              <Mail className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>Email</span>
            </Button>
          </div>
        </div>

        {/* QR Code and Embed expandable areas */}
        <div className="flex space-x-2 border-t border-zinc-100 dark:border-border pt-4">
          <Button
            variant="outline"
            onClick={() => { setShowQr(!showQr); setShowEmbed(false); }}
            className={`text-xs font-semibold space-x-1.5 border-border dark:border-border ${showQr ? 'bg-accent dark:bg-zinc-800' : ''}`}
          >
            <QrCode className="w-4 h-4" />
            <span>{showQr ? 'Hide QR Code' : 'QR Code'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => { setShowEmbed(!showEmbed); setShowQr(false); }}
            className={`text-xs font-semibold space-x-1.5 border-border dark:border-border ${showEmbed ? 'bg-accent dark:bg-zinc-800' : ''}`}
          >
            <Code className="w-4 h-4" />
            <span>{showEmbed ? 'Hide Embed Code' : 'Embed Code'}</span>
          </Button>
        </div>

        {/* QR Code display */}
        {showQr && (
          <div className="flex flex-col items-center justify-center p-6 bg-muted dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-border space-y-4 animate-in slide-in-from-top-4 duration-200">
            <div className="bg-card p-3 rounded-lg border border-border dark:border-zinc-700 shadow-inner">
              <img src={qrCodeUrl} alt="Form QR Code" className="w-[180px] h-[180px]" />
            </div>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center max-w-[250px]">
              Scan QR code on your mobile device to fill questionnaire.
            </p>
            <Button onClick={downloadQrCode} variant="outline" size="sm" className="text-xs font-semibold">
              Download QR Code Image
            </Button>
          </div>
        )}

        {/* Embed code display */}
        {showEmbed && (
          <div className="p-4 bg-muted dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-border space-y-3 animate-in slide-in-from-top-4 duration-200">
            <label className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">IFrame Embed Code</label>
            <div className="flex items-center space-x-2">
              <textarea
                readOnly
                value={embedCode}
                className="w-full p-2.5 font-mono text-xs border border-border dark:border-border bg-card dark:bg-zinc-900 text-foreground dark:text-foreground rounded-lg h-20 focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCopyEmbed} size="sm" className="space-x-1.5">
                {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmbed ? 'Copied Snippet' : 'Copy Embed Code'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareModal;

