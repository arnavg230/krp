import AdminLogin from "@/components/admin-login";
import Link from "next/link";

export default function AdminLoginPage() {
  return <main className="admin-login-screen"><Link href="/" className="brand"><span className="brand-mark">K</span><span><b>KRP Dry Fruits</b><small>SHOP OWNER ACCESS</small></span></Link><AdminLogin/></main>;
}
