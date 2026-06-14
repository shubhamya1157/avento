import Nav from "@/app/component/Nav";
import PublicHome from "@/app/component/PublicHome";
import Footer from "@/app/component/Footer";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-black">
      <Nav />
      <PublicHome />
      <Footer />
    </div>
  );
}
