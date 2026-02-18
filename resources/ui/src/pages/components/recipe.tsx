import React, { useCallback, useContext, useRef, useState, useEffect } from "react";
import {
  SpaceBetween,
  Container,
  Box,
  SegmentedControl,
  Input,
  FormField,
  Grid,
  Multiselect,
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
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [selectedImgSrc, setSelectedImgSrc] = useState<string[]>([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showOptionsButtons, setShowOptionsButtons] = useState(true);
  const [loadingVideoDevices, setLoadingVideoDevices] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<{
    value: string;
  } | null>(null);

  // Recipe context state
  const [recipeTime, setRecipeTime] = useState<any>({ label: "30 min", value: "30" });
  const [recipePeople, setRecipePeople] = useState<any>({ label: "4 people", value: "4" });
  const [recipeEquipment, setRecipeEquipment] = useState<readonly any[]>([]);
  const [recipeBudget, setRecipeBudget] = useState<any>({ label: "$10", value: "10" });

  const { devMode } = useContext(DevModeContext);

  // Currency symbol based on language
  const currencySymbol = ['french', 'spanish', 'italian'].includes(language) ? '€' : '$';

  // Load recipe context from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recipeContext");
    if (stored) {
      const context = JSON.parse(stored);
      setRecipeTime(context.time || { label: "30 min", value: "30" });
      setRecipePeople(context.people || { label: "4 people", value: "4" });
      setRecipeEquipment(context.equipment || []);
      setRecipeBudget(context.budget || { label: "$10", value: "10" });
    }
  }, []);

  // Save recipe context to localStorage
  useEffect(() => {
    const context = {
      time: recipeTime,
      people: recipePeople,
      equipment: recipeEquipment,
      budget: recipeBudget,
    };
    localStorage.setItem("recipeContext", JSON.stringify(context));
  }, [recipeTime, recipePeople, recipeEquipment, recipeBudget]);

  const loadSingleMockImage = async (imageNumber: number) => {
    const imgName = `fridge${imageNumber}.jpeg`;
    try {
      const imgPath = `/img/${imgName}`;
      const response = await fetch(imgPath);
      const blob = await response.blob();
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            setCapturedImages([reader.result as string]);
            setShowOptionsButtons(true);
          }
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`Failed to load ${imgName}:`, error);
    }
  };

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

  const addImage = () => {
    if (imgSrc) {
      setCapturedImages([...capturedImages, imgSrc]);
      setImgSrc(null);
      setShowOptionsButtons(true);
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  const startWebcam = () => {
    setSelectedImgSrc([]);
    setImgSrc(null);
    setShowWebcam(true);
    enumerateDevices();
  };

  const retake = () => {
    setImgSrc(null);
  };

  const useTheseImages = () => {
    const allImages = imgSrc ? [...capturedImages, imgSrc] : capturedImages;
    setSelectedImgSrc(allImages);
    setShowOptionsButtons(false);
  };

  const currentTranslations = customTranslations[language];

  const fileUploadOnChange = ({ detail }) => {
    setSelectedImgSrc([]);
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
                  {!imgSrc && capturedImages.length === 0 && (
                    <div style={{
                      background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
                      borderRadius: "16px",
                      padding: "20px 16px",
                      marginBottom: "20px",
                      boxShadow: "0 4px 16px rgba(0, 200, 83, 0.2)",
                    }}>
                      <h1 style={{
                        fontSize: "clamp(1.3rem, 4vw, 2.5rem)",
                        fontWeight: "700",
                        color: "#fff",
                        marginBottom: "6px",
                        textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                        lineHeight: "1.2",
                      }}>
                        🛒 Shop Smarter with AI
                      </h1>
                      <p style={{
                        color: "rgba(255, 255, 255, 0.95)",
                        fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
                        marginBottom: "0",
                        lineHeight: "1.3",
                      }}>
                        Snap your fridge → Get recipes → Add to cart
                      </p>
                    </div>
                  )}
                  
                  {/* Recipe Context Form */}
                  {!imgSrc && capturedImages.length === 0 && (
                    <Container>
                      <SpaceBetween direction="vertical" size="s">
                        <h3 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "1.2rem" }}>Recipe Context</h3>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: "12px",
                        }}>
                          <FormField label="Time">
                            <Select
                              selectedOption={recipeTime}
                              onChange={({ detail }) => setRecipeTime(detail.selectedOption)}
                              options={[
                                { label: "15 min", value: "15" },
                                { label: "30 min", value: "30" },
                                { label: "45 min", value: "45" },
                                { label: "60 min", value: "60" },
                                { label: "90+ min", value: "90" },
                              ]}
                            />
                          </FormField>
                          <FormField label="People">
                            <Select
                              selectedOption={recipePeople}
                              onChange={({ detail }) => setRecipePeople(detail.selectedOption)}
                              options={[
                                { label: currentTranslations["people_1"], value: "1" },
                                { label: currentTranslations["people_2"], value: "2" },
                                { label: currentTranslations["people_4"], value: "4" },
                                { label: currentTranslations["people_6"], value: "6" },
                                { label: currentTranslations["people_8"], value: "8" },
                              ]}
                            />
                          </FormField>
                          <FormField label="Equipment">
                            <Multiselect
                              selectedOptions={recipeEquipment}
                              onChange={({ detail }) => setRecipeEquipment(detail.selectedOptions)}
                              options={[
                                { label: currentTranslations["equipment_stovetop"], value: "stovetop" },
                                { label: currentTranslations["equipment_oven"], value: "oven" },
                                { label: currentTranslations["equipment_microwave"], value: "microwave" },
                                { label: currentTranslations["equipment_airfryer"], value: "airfryer" },
                                { label: currentTranslations["equipment_instantpot"], value: "instantpot" },
                                { label: currentTranslations["equipment_ricecooker"], value: "ricecooker" },
                                { label: currentTranslations["equipment_blender"], value: "blender" },
                                { label: currentTranslations["equipment_foodprocessor"], value: "foodprocessor" },
                              ]}
                              placeholder="Select"
                            />
                          </FormField>
                          <FormField label="Budget">
                            <Select
                              selectedOption={recipeBudget}
                              onChange={({ detail }) => setRecipeBudget(detail.selectedOption)}
                              options={[
                                { label: `${currencySymbol}5`, value: "5" },
                                { label: `${currencySymbol}10`, value: "10" },
                                { label: `${currencySymbol}15`, value: "15" },
                                { label: `${currencySymbol}20`, value: "20" },
                                { label: `${currencySymbol}30+`, value: "30" },
                              ]}
                            />
                          </FormField>
                        </div>
                      </SpaceBetween>
                    </Container>
                  )}
                  
                  {/* Sample fridge images - hero cards */}
                  {!imgSrc && capturedImages.length === 0 && (
                    <div style={{ marginBottom: "40px", marginTop: "30px" }}>
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                        gap: "24px", 
                        maxWidth: "900px",
                        margin: "0 auto",
                        padding: "0 20px",
                      }}>
                        {[
                          { num: 1, title: "🥬 Fresh & Healthy" },
                          { num: 2, title: "🍖 Meal Prep Ready" },
                          { num: 3, title: "🍊 Family Favorites" }
                        ].map(({ num, title }) => (
                          <div
                            key={num}
                            onClick={() => loadSingleMockImage(num)}
                            style={{
                              position: "relative",
                              cursor: "pointer",
                              borderRadius: "16px",
                              overflow: "hidden",
                              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              background: "#fff",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                              e.currentTarget.style.boxShadow = "0 16px 48px rgba(0, 200, 83, 0.35)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0) scale(1)";
                              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                            }}
                          >
                            <div style={{
                              position: "absolute",
                              top: "12px",
                              left: "12px",
                              right: "12px",
                              background: "rgba(255, 255, 255, 0.95)",
                              color: "#333",
                              padding: "8px 16px",
                              borderRadius: "12px",
                              fontSize: "1rem",
                              fontWeight: "700",
                              zIndex: 10,
                              backdropFilter: "blur(10px)",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            }}>
                              {title}
                            </div>
                            <img
                              src={`/img/fridge${num}.jpeg`}
                              alt={title}
                              style={{
                                width: "100%",
                                height: "320px",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Camera option - minimal, below cards */}
                  {!imgSrc && capturedImages.length === 0 && (
                    <div style={{
                      textAlign: "center",
                      padding: "20px",
                      borderTop: "1px solid #e0e0e0",
                      marginTop: "20px",
                    }}>
                      <p style={{ 
                        color: "#666", 
                        marginBottom: "12px",
                        fontSize: "0.95rem",
                      }}>
                        Or use your own ingredients
                      </p>
                      <Button 
                        variant="normal" 
                        onClick={startWebcam}
                      >
                        📷 Take Your Own Photo
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected fridge image - modern card */}
              {capturedImages.length > 0 && !imgSrc && (
                <div style={{
                  background: "#fff",
                  borderRadius: "20px",
                  padding: "32px",
                  boxShadow: "0 8px 32px rgba(0, 200, 83, 0.15)",
                  maxWidth: "600px",
                  margin: "0 auto",
                }}>
                  {/* Success badge */}
                  <div style={{
                    background: "linear-gradient(135deg, #00C853 0%, #64DD17 100%)",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    marginBottom: "24px",
                    textAlign: "center",
                  }}>
                    <p style={{
                      color: "#fff",
                      margin: 0,
                      fontSize: "1rem",
                      fontWeight: "600",
                    }}>
                      ✅ {currentTranslations["recipe_captured_images"]} ({capturedImages.length})
                    </p>
                  </div>

                  {/* Large preview image */}
                  <div style={{ position: "relative", marginBottom: "24px" }}>
                    {capturedImages.map((img, index) => (
                      <div key={index} style={{ position: "relative" }}>
                        <img
                          src={img}
                          style={{
                            width: "100%",
                            height: "400px",
                            objectFit: "cover",
                            borderRadius: "16px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                          }}
                        />
                        <div style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                        }}>
                          <Button
                            iconName="close"
                            variant="icon"
                            onClick={() => removeImage(index)}
                            ariaLabel="Remove image"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <SpaceBetween direction="vertical" size="m">
                    <Button 
                      onClick={useTheseImages} 
                      variant="primary"
                      fullWidth
                      iconName="search"
                    >
                      🔍 {currentTranslations["recipe_generate_recipes"]}
                    </Button>
                    <Button 
                      onClick={startWebcam} 
                      variant="normal"
                      fullWidth
                    >
                      📷 {currentTranslations["recipe_add_more"]}
                    </Button>
                  </SpaceBetween>
                </div>
              )}

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
                        <Button onClick={retake} variant="normal">
                          {currentTranslations["recipe_retake_photo"]}
                        </Button>
                        <Button onClick={addImage} variant="normal">
                          {currentTranslations["recipe_add_image"]}
                        </Button>
                        <Button onClick={useTheseImages} variant="primary">
                          {capturedImages.length > 0 
                            ? currentTranslations["recipe_generate_recipes"]
                            : currentTranslations["recipe_use_this"]}
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

        {selectedImgSrc.length > 0 && (
          <div>
            <ImageIngredients
              images={selectedImgSrc}
              language={language}
              recipeContext={{
                time: recipeTime?.value,
                people: recipePeople?.value,
                equipment: recipeEquipment,
                budget: recipeBudget?.value,
              }}
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
