import { Outlet } from "react-router";

const links = [
  ["Session Token", "/sessiontoken"],
  ["Admin Link", "/adminlink"],
  ["Theme App Extension", "/themeapp"],
  ["Function Discount", "/functiondiscount"],
  ["Function Shipping", "/functionshipping"],
  ["Function Payment", "/functionpayment"],
  ["Function Cart", "/functioncart"],
  ["Web Pixel", "/webpixel"],
  ["Post-purchase", "/postpurchase"],
  ["Checkout UI", "/checkoutui"],
  ["Customer Account UI", "/customeraccountui"],
  ["Order management", "/ordermanage"],
  ["Bulk Operation", "/bulkoperation"],
  ["Storefront API", "/storefront"],
  ["POS UI", "/posui"],
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
