// ===========================================================================
// postcss.config.mjs — Sets up the tool that processes our CSS
// ===========================================================================
//
// A "config" file is just a settings file: it tells a tool how to behave.
//
// PostCSS is a helper that runs over our CSS and transforms it. Think of it as
// an assembly line for stylesheets: the raw CSS goes in, "plugins" (small
// add-on tools, each doing one job) change it along the way, and the finished
// CSS comes out the other end.
//
// The ".mjs" file ending means this is a JavaScript "module" — a self-contained
// file that can share its settings with the rest of the project using `export`.
//
// In this project there is exactly one plugin in the line: Tailwind CSS. It
// reads the short class names we sprinkle through the markup (like
// "flex" or "bg-black") and turns them into the real CSS rules that style the
// page. The empty `{}` next to it simply means "use Tailwind's default
// settings — we don't need to customise anything."
// ===========================================================================

const config = {
  plugins: {
    // The Tailwind plugin for PostCSS. `{}` = no extra options, use defaults.
    "@tailwindcss/postcss": {},
  },
};

// Hand these settings to PostCSS (and to Next.js, which runs PostCSS for us).
export default config;
