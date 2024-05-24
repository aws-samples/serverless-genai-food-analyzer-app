import React, { useState, useEffect, useContext } from "react";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
import Button from "@cloudscape-design/components/button";
import Ingredients from "./barcode_ingredients";
import Badge from "@cloudscape-design/components/badge";
import Link from "@cloudscape-design/components/link";
import {
  Box,
  Container,
  Input,
  SpaceBetween,
} from "@cloudscape-design/components";
import customTranslations from "../../assets/i18n/all";
import { DevModeContext, LanguageContext } from "../app";

const InputWithButton = ({ value, onChange, onClick, buttonText }) => {
  return (
    <div
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      <input
        type="text"
        value={value}
        onChange={onChange}
        style={{ marginRight: "5px" }} // Adjust the spacing between input and button
      />
      <button onClick={onClick}>{buttonText}</button>
    </div>
  );
};

const isBarcodeValid = (decodedText: string) => {
  // Regular expression pattern to match EAN-13 barcode or Open Food Facts assigned numbers
  const barcodePattern = /^(?:\d{13}|200\d{10})$/;

  // Test if the decoded text matches the pattern
  return barcodePattern.test(decodedText);
};

const Barcode: React.FC = () => {
  const language = useContext(LanguageContext);
  const { devMode } = useContext(DevModeContext);
  const [productCode, setProductCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [tempProductCode, setTempProductCode] = useState("");
  const currentTranslations = customTranslations[language]; // Get translations for the current language or fallback to English

  let html5QrcodeScanner: any;

  function onScanFailure(error: unknown) {
    console.warn(`Code scan error = ${error}`);
  }

  const onScanSuccess = (decodedText: string, decodedResult: string) => {
    const isValid = isBarcodeValid(decodedText);
    setShowScanner(false);
    console.log(isValid); // Output: true if valid, false otherwise
    if (isValid) {
      setProductCode(decodedText);

      html5QrcodeScanner
        .clear()
        .then(() => {
          console.log("Scanner cleared");
        })
        .catch((error: unknown) => {
          console.warn("Error clearing scanner:", error);
        });
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup when the component unmounts
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch((error: unknown) => {
          console.warn("Error clearing scanner during unmount:", error);
        });
      }
    };
  }, []); // Empty dependency array to ensure the effect runs only once on mount

  const handleButtonClick = () => {
    setShowScanner(true);
    setProductCode("");
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Set the size of the QR code box dynamically
    const maxQrboxWidth = Math.min(windowWidth * 0.8, 400); // Adjust as needed
    let qrboxWidth = maxQrboxWidth;
    let qrboxHeight = qrboxWidth / 2; // Maintain 2:1 width:height ratio

    // Ensure the QR code box fits within the window's height
    if (qrboxHeight > windowHeight * 0.8) {
      qrboxHeight = windowHeight * 0.8;
      qrboxWidth = qrboxHeight * 2; // Maintain 2:1 ratio
    }
    html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 60,
        qrbox: { width: qrboxWidth, height: qrboxHeight },
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  };

  return (
    <div>
      <SpaceBetween direction="vertical" size="m">
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            {!showScanner && (
              <Button variant="primary" onClick={handleButtonClick}>
                {currentTranslations["scan_button_label"]}
              </Button>
            )}
            {devMode && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "10px",
                }}
              >
                <SpaceBetween direction="horizontal" size="xs">
                  <Input
                    type="text"
                    placeholder={
                      currentTranslations["scan_button_number_label"]
                    }
                    value={tempProductCode}
                    onChange={({ detail }) => setTempProductCode(detail.value)}
                  />
                  <Button onClick={() => setProductCode(tempProductCode)}>
                    OK
                  </Button>
                </SpaceBetween>
              </div>
            )}
          </div>
        </div>

        {!showScanner && (
          <Box>
            <div style={{ textAlign: "left" }}>
              <h4>{currentTranslations["scan_main_title"]}</h4>

              <SpaceBetween direction="vertical" size="m">
                <div>
                  <p>
                    <Badge color="green">1</Badge>{" "}
                    {currentTranslations["scan_label_1"]}{" "}
                    <Link href="/preference">
                      {currentTranslations["scan_label_2"]}
                    </Link>
                  </p>
                  <p>
                    <Badge color="green">2</Badge>{" "}
                    {currentTranslations["scan_label_3"]}
                  </p>
                </div>
              </SpaceBetween>
            </div>
          </Box>
        )}
        <div id="reader"></div>

        {productCode && (
          <div>
            <Ingredients productCode={productCode} language={language} />
          </div>
        )}
      </SpaceBetween>
    </div>
  );
};

export default Barcode;
