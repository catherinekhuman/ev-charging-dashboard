#include <Arduino.h>
#include "esp_camera.h"
#include <WiFi.h>

#include "board_config.h"
#include "secrets.h"

// =====================================================
// WiFi
// =====================================================
const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;

// =====================================================
// Camera Web Server
// =====================================================
void startCameraServer();
void setupLedFlash();


// =====================================================
// SETUP
// =====================================================
void setup()
{
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  Serial.println();
  Serial.println("========================================");
  Serial.println("         ESP32-CAM QR CAMERA");
  Serial.println("========================================");

  camera_config_t config;

  // ===================================================
  // CAMERA PINS
  // ===================================================

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 20000000;

  // ===================================================
  // CAMERA FORMAT
  // ===================================================

  config.pixel_format = PIXFORMAT_JPEG;

  // ===================================================
  // DEFAULT SETTINGS
  // ===================================================

  config.frame_size = FRAMESIZE_VGA;        // 640x480
  config.jpeg_quality = 8;
  config.fb_count = 1;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;

  // ===================================================
  // PSRAM SETTINGS
  // ===================================================

  if (psramFound())
  {
    Serial.println("PSRAM: YES");

    config.frame_size = FRAMESIZE_VGA;      // 640x480
    config.jpeg_quality = 8;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  }
  else
  {
    Serial.println("PSRAM: NO");

    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  // ===================================================
  // CAMERA INITIALIZATION
  // ===================================================

  Serial.println("Initializing camera...");

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK)
  {
    Serial.printf(
      "Camera init failed with error 0x%x\n",
      err
    );

    while (true)
    {
      delay(1000);
    }
  }

  Serial.println("Camera initialized successfully!");

  // ===================================================
  // SENSOR SETTINGS
  // ===================================================

  sensor_t *s = esp_camera_sensor_get();

  if (s != nullptr)
  {
    if (s->id.PID == OV3660_PID)
    {
      s->set_vflip(s, 1);
      s->set_brightness(s, 1);
      s->set_saturation(s, -2);
    }

    // QR scanning resolution
    s->set_framesize(s, FRAMESIZE_VGA);
  }

  // ===================================================
  // LED
  // ===================================================

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  // ===================================================
  // WIFI
  // ===================================================

  Serial.println();
  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("WiFi connecting");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");

  Serial.print("ESP32 IP address: ");
  Serial.println(WiFi.localIP());

  // ===================================================
  // CAMERA WEB SERVER
  // ===================================================

  Serial.println();
  Serial.println("Starting Camera Web Server...");

  startCameraServer();

  Serial.println();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");

  Serial.println();
  Serial.println("QR camera settings:");
  Serial.println("Resolution : VGA (640x480)");
  Serial.println("JPEG quality: 8");
  Serial.println("PSRAM      : YES/available");
}


// =====================================================
// LOOP
// =====================================================
void loop()
{
  delay(10000);
}
