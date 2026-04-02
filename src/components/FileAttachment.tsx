import Icon from "@/components/ui/icon";
import { isImage, isVideo, formatSize } from "@/lib/upload";

interface Props {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export default function FileAttachment({ url, fileName, mimeType, size }: Props) {
  if (isImage(mimeType)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden">
        <img src={url} alt={fileName} className="w-full max-h-72 object-cover hover:opacity-95 transition-opacity" />
      </a>
    );
  }

  if (isVideo(mimeType)) {
    return (
      <video controls className="w-full rounded-xl max-h-64">
        <source src={url} type={mimeType} />
      </video>
    );
  }

  const ext = fileName.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-secondary rounded-xl hover:bg-secondary/70 transition-colors group"
    >
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
        <span className="text-[10px] font-bold text-muted-foreground">{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {size !== undefined && <p className="text-xs text-muted-foreground">{formatSize(size)}</p>}
      </div>
      <Icon name="Download" size={15} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
    </a>
  );
}
