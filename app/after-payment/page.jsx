import AfterPaymentClient from "./AfterPaymentClient";

export default function AfterPaymentPage({ searchParams }) {
  const videoId = typeof searchParams?.videoId === "string" ? searchParams.videoId : "";

  return <AfterPaymentClient videoId={videoId} />;
}
