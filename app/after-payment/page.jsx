import AfterPaymentClient from "./AfterPaymentClient";

export default function AfterPaymentPage({ searchParams }) {
  const videoId = typeof searchParams?.videoId === "string" ? searchParams.videoId : "";
  const errorDescription = typeof searchParams?.errordescription === "string" ? searchParams.errordescription : "";

  return <AfterPaymentClient videoId={videoId} errorDescription={errorDescription} />;
}
