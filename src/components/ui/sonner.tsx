import { useSyncExternalStore } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function subscribeToHtmlClass(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => {};
  const el = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getDocumentTheme(): ToasterProps["theme"] {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerTheme(): ToasterProps["theme"] {
  return "dark";
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useSyncExternalStore(subscribeToHtmlClass, getDocumentTheme, getServerTheme);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-stitch-border group-[.toaster]:bg-stitch-card group-[.toaster]:text-white group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-white",
          description: "group-[.toast]:text-stitch-muted",
          actionButton:
            "group-[.toast]:bg-stitch-accent group-[.toast]:font-semibold group-[.toast]:text-black group-[.toast]:hover:bg-stitch-accent/90",
          cancelButton:
            "group-[.toast]:border-stitch-border group-[.toast]:bg-stitch-pill group-[.toast]:text-stitch-muted-soft group-[.toast]:hover:bg-stitch-card group-[.toast]:hover:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
