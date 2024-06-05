import React, { useCallback, useContext, useRef, useState } from "react";
import {
  SpaceBetween,
  Container,
  Box,
  SegmentedControl,
  Input,
} from "@cloudscape-design/components";
import Button from "@cloudscape-design/components/button";
import customTranslations from "../../assets/i18n/all";
import Webcam from "react-webcam";
import ImageIngredients from "./recipe_image_ingredients";
import Select from "@cloudscape-design/components/select";
import Badge from "@cloudscape-design/components/badge";
import Link from "@cloudscape-design/components/link";
import { DevModeContext, LanguageContext } from "../app";
import FileUpload from "@cloudscape-design/components/file-upload";

const Recipe: React.FC = () => {
  const language = useContext(LanguageContext);
  const webcamRef = useRef<any>();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [myValue, setMyValue] = useState([]);
  const [selectedImgSrc, setSelectedImgSrc] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showOptionsButtons, setShowOptionsButtons] = useState(true);
  const [loadingVideoDevices, setLoadingVideoDevices] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<{
    value: string;
  } | null>(null);


  const { devMode } = useContext(DevModeContext);

  const enumerateDevices = async () => {
    try {
      setLoadingVideoDevices(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      mediaStream.getTracks().forEach((track) => track.stop());
      const videoDevices = mediaDevices.filter(
        (device) => device.kind === "videoinput"
      );

      setDevices(videoDevices);
      const deviceId = videoDevices.filter((d) =>
        d.label.toLowerCase().includes("back")
      );
      if (deviceId.length > 0) {
        setSelectedDevice({
          value: deviceId[0].deviceId,
        });
      } else {
        setSelectedDevice({
          value: videoDevices[0].deviceId,
        });
      }
    } catch (error) {
      console.error("Error enumerating devices:", error);
    } finally {
      setLoadingVideoDevices(false);
    }
  };


function resizeBase64Image(base64Image: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create an Image element
    const image = new Image();
    image.src = base64Image;

    // Handle image load
    image.onload = () => {
      try {
        const resizedDataUrl = resizeImage(image, width, height);
        resolve(resizedDataUrl as string);
      } catch (error) {
        reject(error);
      }
    };

    // Handle image load error
    image.onerror = () => {
      reject("Failed to load image");
    };
  });
}
  function resizeImage(image: any, width: number, height: number) {
    // Create a canvas element
    
    const canvas = document.createElement("canvas");
    const ratio = image.height / image.width;
    // Set the canvas dimensions to the desired size
    canvas.width = width;
    canvas.height = height * ratio;
    console.log(canvas.width, canvas.height);
    // Get the 2D rendering context of the canvas
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Draw the image on the canvas, resizing it to the desired size

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);



    return canvas.toDataURL();;
    }
  }

  async function handleResize(imageSrc: string) {
    try {
      const resizedImage = await resizeBase64Image(imageSrc, 400, 400);
      setImgSrc(resizedImage ?? null);
    } catch (error) {
      console.error("Error resizing image:", error);
      setImgSrc(null);
    }
  }

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current!.getScreenshot();
      handleResize(imageSrc);
      setShowWebcam(false);
      setShowOptionsButtons(true);
    }
  }, [webcamRef]);

  const startWebcam = () => {
    setSelectedImgSrc(null);
    setImgSrc(null);
    setShowWebcam(true);
    enumerateDevices();
  };

  const retake = () => {
    setImgSrc(null);
  };
  const useThisImage = () => {
    setShowOptionsButtons(false);
    //setShowWebcam(false);

    setSelectedImgSrc(imgSrc);
  };

  const currentTranslations = customTranslations[language];

  const fileUploadOnChange = ({ detail }) => {
    setSelectedImgSrc(null);
    console.log(detail.value);
    const files = detail.value;
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.src = reader.result as string;

        image.onload = () => {
          const resizedImage = resizeImage(image, 400, 400);
          setImgSrc(resizedImage ?? null);
          //console.log("resizedImage base 64");
          //console.log(resizedImage);
          setShowOptionsButtons(true);
        };
      };
      reader.readAsDataURL(files[0]);
    }
  };

  return (
    <div>
      <SpaceBetween direction="vertical" size="m">
        <Box>
          <div className="container">
            <SpaceBetween direction="vertical" size="s">
              {/* Render the button only when imgSrc is available */}
              {!showWebcam && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <Button variant="primary" onClick={startWebcam}>
                      {currentTranslations["recipe_button_label"]}
                    </Button>
                    {devMode && (
                      <FileUpload
                        onChange={fileUploadOnChange}
                        value={myValue}
                        accept="image/png, image/jpg"
                        i18nStrings={{
                          uploadButtonText: (e) =>
                            e
                              ? currentTranslations["recipe_button_file_label"]
                              : currentTranslations["recipe_button_file_label"],
                          dropzoneText: (e) =>
                            e ? "Drop files to upload" : "Drop file to upload",
                          removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
                          limitShowFewer: "Show fewer files",
                          limitShowMore: "Show more files",
                          errorIconAriaLabel: "Error",
                        }}
                        tokenLimit={1}
                      />
                    )}
                  </div>

                  {!imgSrc && (
                    <div style={{ textAlign: "left" }}>
                      <h4>{currentTranslations["recipe_main_title"]}</h4>

                      <SpaceBetween direction="vertical" size="m">
                        <div>
                          <p>
                            <Badge color="green">1</Badge>{" "}
                            {currentTranslations["recipe_label_1"]}{" "}
                            <Link href="/preference">
                              {currentTranslations["recipe_label_2"]}
                            </Link>
                          </p>
                          <p>
                            <Badge color="green">2</Badge>{" "}
                            {currentTranslations["recipe_label_3"]}
                          </p>                          
                        </div>
                      </SpaceBetween>
                    </div>
                  )}
                </div>
              )}

              {/* Conditionally render the image */}
              {imgSrc && (
                <>
                  <div style={{ textAlign: "center", maxHeight: "70vh" }}>
                    <img
                      src={imgSrc}
                      style={{
                        borderRadius: "5px",
                        display: "block",
                        margin: "auto",
                        height: "70vh",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  {showOptionsButtons && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "10px",
                      }}
                    >
                      <SpaceBetween direction="horizontal" size="s">
                        {/* <Button onClick={retake} variant="primary">
                          {currentTranslations["recipe_retake_photo"]}
                        </Button> */}

                        <Button onClick={useThisImage} variant="primary">
                          {currentTranslations["recipe_use_this"]}
                        </Button>
                      </SpaceBetween>
                    </div>
                  )}
                </>
              )}
            </SpaceBetween>

            <div style={{ textAlign: "center" }}>
              {/* Conditionally render the retake and useThisImage buttons */}

              {/* Conditionally render the webcam or captured image */}
              {showWebcam && !imgSrc && (
                <div>
                  {loadingVideoDevices ? (
                    <div>{currentTranslations["recipe_search_video_src"]}</div>
                  ) : (
                    <div>
                      <SpaceBetween direction="vertical" size="m">
                        {devices.length > 1 && (
                          <div
                            style={{
                              justifyContent: "center",
                              display: "flex",
                            }}
                          >
                            <SegmentedControl
                              selectedId={selectedDevice?.value ?? null}
                              options={devices.map((device, index) => ({
                                text: device.label.replace(" Camera", ""),
                                id: device.deviceId,
                              }))}
                              onChange={({ detail }) => {
                                setSelectedDevice({
                                  value: detail.selectedId,
                                });
                              }}
                            />
                          </div>
                        )}

                        {selectedDevice && (
                          <SpaceBetween direction="vertical" size="m">
                            <div style={{ textAlign: "center", maxHeight: "70vh" }}>
                              <Webcam
                                audio={false}
                                videoConstraints={{
                                  deviceId: selectedDevice.value,
                                }}
                                ref={webcamRef}
                                style={{
                                  borderRadius: "5px",
                                  display: "block",
                                  margin: "auto",
                                  height: "70vh",
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                }}
                                
                              />
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <Button onClick={capture} variant="primary">
                                {currentTranslations["recipe_take_picture"]}
                              </Button>
                            </div>
                          </SpaceBetween>
                        )}
                      </SpaceBetween>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Box>

        <div id="reader"></div>

        {selectedImgSrc && (
          <div>
            <ImageIngredients
              img={selectedImgSrc}
              language={language}
              onRecipePropositionsDone={() => {
                setShowWebcam(false);
              }}
            />
          </div>
        )}
      </SpaceBetween>
    </div>
  );
};

export default Recipe;
