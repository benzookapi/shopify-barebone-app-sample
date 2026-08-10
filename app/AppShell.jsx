import { Outlet } from "react-router";

const links = [
  ["Session Token", "/sessiontoken"],
  ["Admin Link", "/adminlink"],
  ["Theme App Extension", "/themeapp"],
  ["Function Discount", "/functiondiscount"],
  ["Function Shipping", "/functionshipping"],
  ["Function Payment", "/functionpayment"],
  ["Web Pixel", "/webpixel"],
  ["Post-purchase", "/postpurchase"],
  ["Checkout UI", "/checkoutui"],
  ["Order management", "/ordermanage"],
  ["Bulk Operation", "/bulkoperation"],
  ["Storefront API", "/storefront"],
];

export default function AppShell() {
  return (
    <>
      <ui-title-bar title="Welcome to my barebone app"></ui-title-bar>
      <s-app-nav>
        <a href="/" rel="home">
          Home
        </a>
        {links.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </s-app-nav>
      <Outlet />
    </>
  );
}
