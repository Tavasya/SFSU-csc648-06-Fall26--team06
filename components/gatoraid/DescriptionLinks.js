// Keep descriptions as text, linking only explicit web addresses.
export default function DescriptionLinks({ text = "" }) {
  const parts = String(text || "").split(/(https?:\/\/[^\s<>"']+)/gi);

  return parts.map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return part;

    // Sentence punctuation is not part of the destination.
    const match = part.match(/^(.*?)([.,!?;:]*[)\]}]*)$/);
    const url = match[1];
    const trailing = match[2];
    try {
      const parsed = new URL(url);
      if (!parsed.hostname) return part;
    } catch {
      return part;
    }

    return (
      <span key={index}>
        <a className="break-all text-[#604398] underline underline-offset-2 hover:text-[#503581]" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        {trailing}
      </span>
    );
  });
}
