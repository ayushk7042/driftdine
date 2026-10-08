import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Code, ExternalLink, Heading2, Heading3, ImageIcon, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  onPickImage: () => void;
  /** Called with an insert function so the parent's media picker can place an image. */
  registerInsert: (fn: (url: string, alt?: string) => void) => void;
}

const Btn = ({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) => (
  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={on} title={label} aria-label={label} disabled={disabled}
    className={cn("grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30", active && "bg-brand-soft text-brand")}>
    {children}
  </button>
);

/** Images carry their own redirect link (kept through the server sanitiser as data-redirect). */
const LinkedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-redirect": { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-redirect") || el.closest("a")?.getAttribute("href") || null, renderHTML: (a: Record<string, string>) => (a["data-redirect"] ? { "data-redirect": a["data-redirect"] } : {}) },
      "data-new-tab": { default: "1", parseHTML: (el: HTMLElement) => el.getAttribute("data-new-tab") || "1", renderHTML: (a: Record<string, string>) => ({ "data-new-tab": a["data-new-tab"] || "1" }) },
    };
  },
});

export function RichEditor({ value, onChange, onPickImage, registerInsert }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      LinkedImage.configure({ HTMLAttributes: { loading: "lazy" } }),
      Placeholder.configure({ placeholder: "Start writing your story…" }),
    ],
    content: value,
    editorProps: { attributes: { class: "tiptap prose prose-article max-w-none px-5 py-4 focus:outline-none" } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    onSelectionUpdate: ({ editor: e }) => setImg(e.isActive("image") ? { ...e.getAttributes("image") } : null),
    onTransaction: ({ editor: e }) => { if (!e.isActive("image")) setImg(null); },
  });
  const [img, setImg] = useState<Record<string, string> | null>(null);
  const setImage = (patch: Record<string, string | null>) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", patch).run();
    setImg({ ...editor.getAttributes("image") });
  };

  useEffect(() => {
    if (!editor) return;
    registerInsert((url, alt) => editor.chain().focus().setImage({ src: url, alt: alt || "" }).run());
  }, [editor, registerInsert]);

  // Adopt externally-loaded content once (article fetched after mount).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div className="skeleton h-96" />;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-2xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <div className="sticky top-[8.25rem] z-10 flex flex-wrap items-center gap-0.5 rounded-t-2xl border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur">
        <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Btn>
        <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Btn>
        <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Btn>
        <Btn label="Underline" active={editor.isActive("underline")} on={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Btn>
        <Btn label="Strikethrough" active={editor.isActive("strike")} on={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>
        <Btn label="Code" active={editor.isActive("code")} on={() => editor.chain().focus().toggleCode().run()}><Code className="size-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Btn>
        <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Btn>
        <Btn label="Divider" on={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn label="Link" active={editor.isActive("link")} on={setLink}><Link2 className="size-4" /></Btn>
        <Btn label="Remove link" disabled={!editor.isActive("link")} on={() => editor.chain().focus().unsetLink().run()}><Unlink className="size-4" /></Btn>
        <Btn label="Insert image" on={onPickImage}><ImageIcon className="size-4" /></Btn>
        <span className="ml-auto flex">
          <Btn label="Undo" disabled={!editor.can().undo()} on={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Btn>
          <Btn label="Redo" disabled={!editor.can().redo()} on={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Btn>
        </span>
      </div>
      {img && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft/60 px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand"><ExternalLink className="size-4" /> Image link</span>
          <input
            value={img["data-redirect"] || ""} placeholder="https://… (opens when readers click this image)"
            onChange={(e) => setImage({ "data-redirect": e.target.value || null })}
            className="h-9 min-w-52 flex-1 rounded-lg border border-line bg-surface px-3 outline-none focus:border-brand"
          />
          <input
            value={img.alt || ""} placeholder="Alt text" onChange={(e) => setImage({ alt: e.target.value })}
            className="h-9 w-44 rounded-lg border border-line bg-surface px-3 outline-none focus:border-brand"
          />
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px]">
            <input type="checkbox" checked={img["data-new-tab"] !== "0"} onChange={(e) => setImage({ "data-new-tab": e.target.checked ? "1" : "0" })} className="size-4 accent-[var(--brand)]" /> New tab
          </label>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
