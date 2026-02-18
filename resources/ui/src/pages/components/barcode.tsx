import React, { useState, useEffect, useContext } from "react";
import { Html5QrcodeScanType, Html5QrcodeScanner } from "html5-qrcode";
import { useSearchParams } from "react-router-dom";
import Button from "@cloudscape-design/components/button";
import Ingredients from "./barcode_ingredients";
import Badge from "@cloudscape-design/components/badge";
import Link from "@cloudscape-design/components/link";
import Alert from "@cloudscape-design/components/alert";
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
  // Regular expression pattern to match UPC-A (12 digits), EAN-13 (13 digits), or Open Food Facts assigned numbers
  const barcodePattern = /^(?:\d{12,13}|200\d{10})$/;

  // Test if the decoded text matches the pattern
  return barcodePattern.test(decodedText);
};

const Barcode: React.FC = () => {
  const language = useContext(LanguageContext);
  const { devMode } = useContext(DevModeContext);
  const [searchParams] = useSearchParams();
  const [productCode, setProductCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [tempProductCode, setTempProductCode] = useState("");
  const [hasPreferences, setHasPreferences] = useState(false);
  const currentTranslations = customTranslations[language];

  let html5QrcodeScanner: any;

  // Auto-fetch product if barcode in URL
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && isBarcodeValid(code)) {
      setProductCode(code);
    }
  }, [searchParams]);

  // Check if user has set preferences
  useEffect(() => {
    const stored = localStorage.getItem("userPreferences");
    setHasPreferences(!!stored);
  }, []);

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
              <Button 
                variant="primary" 
                onClick={handleButtonClick}
                iconName="search"
              >
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

        {!showScanner && !productCode && (
          <div>
            {/* Hero Section */}
            <div style={{
              background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
              borderRadius: "16px",
              padding: "20px 16px",
              marginBottom: "20px",
              boxShadow: "0 4px 16px rgba(0, 200, 83, 0.2)",
              textAlign: "center",
            }}>
              <h1 style={{
                fontSize: "clamp(1.3rem, 4vw, 2.5rem)",
                fontWeight: "700",
                color: "#fff",
                marginBottom: "6px",
                lineHeight: "1.2",
              }}>
                🔍 Scan Product Barcode
              </h1>
              <p style={{
                color: "rgba(255, 255, 255, 0.95)",
                fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
                marginBottom: "0",
                lineHeight: "1.3",
              }}>
                Get personalized nutrition & allergen info
              </p>
            </div>

            {!hasPreferences && (
              <Alert
                type="warning"
                header="Set your preferences first"
              >
                To get personalized nutritional information, please{" "}
                <Link href="/preference">set your preferences</Link> before scanning.
              </Alert>
            )}
          </div>
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
