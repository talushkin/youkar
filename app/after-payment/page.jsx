import AfterPaymentClient from "./AfterPaymentClient";

export default function AfterPaymentPage({ searchParams }) {
  const videoId = typeof searchParams?.videoId === "string" ? searchParams.videoId : "";
  const errorDescription = typeof searchParams?.errordescription === "string" ? searchParams.errordescription : "";
  const title = typeof searchParams?.title === "string" ? searchParams.title : "";
  const phone = typeof searchParams?.cellphonenotify === "string" ? searchParams.cellphonenotify
    : typeof searchParams?.phone === "string" ? searchParams.phone
    : "";
  const lang = searchParams?.lang === "en" ? "en" : "he";

  return <AfterPaymentClient videoId={videoId} errorDescription={errorDescription} phone={phone} title={title} lang={lang} />;
}
