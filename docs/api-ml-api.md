AIML API - Image Models Documentation

Overview

The AIML API provides comprehensive image generation capabilities through various models from different developers. This documentation covers all available image models and how to use them via API calls.

API Endpoint

Base URL: https://api.aimlapi.com/v1/images/generations/
Method: POST
Content-Type: application/json

Authentication

Include your AIML API key in the Authorization header:

Plain Text


Authorization: Bearer <YOUR_AIMLAPI_KEY>


How to Generate an Image

1. Select a Model

Choose from the available image models based on your specific needs. Models can be trained for specific tasks (e.g., realistic results), offer higher resolutions, or include features like negative prompts.

2. Create a Prompt

Construct a detailed prompt for the image. The prompt should describe the place, objects, quality, style, and other elements that will shape the image. This is a crucial part of the image generation process and determines what will be depicted.

3. Configure Parameters

Configure the metaparameters for your generation:

•
Steps: The n parameter controls the number of iterations the model will take to shape your image. Experiment with this parameter to achieve the best result for your prompt.

•
Size: The size parameter controls the resolution of the resulting image. All models have minimum and maximum resolutions, sometimes with different aspect ratios. Experiment with this parameter as well.

API Call Examples

Python Example (using requests)

Python


import requests

url = "https://api.aimlapi.com/v1/images/generations/"

payload = {
    "model": "flux-pro",
    "prompt": """
    Create a classroom of young robots.
    The chalkboard in the classroom has 'AI Is Your Friend' written on it.
    """
}

headers = {
    # Put your AIML API Key instead of <YOUR_AIMLAPI_KEY>:
    "Authorization": "Bearer <YOUR_AIMLAPI_KEY>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
response.raise_for_status()

print("Generation:", response.json())


Python Example (using OpenAI SDK)

Python


from openai import OpenAI

client = OpenAI(
    base_url="https://api.aimlapi.com/v1",
    api_key="<YOUR_AIMLAPI_KEY>",
)

response = client.images.generate(
    model="flux-pro",
    prompt="Create a classroom of young robots. The chalkboard in the classroom has 'AI Is Your Friend' written on it.",
    size="1024x1024",
    quality="standard",
    n=1,
)

image_url = response.data[0].url
print(f"Generated image URL: {image_url}")


JavaScript/NodeJS Example

JavaScript


const fetch = require('node-fetch');

const url = "https://api.aimlapi.com/v1/images/generations/";

const payload = {
    model: "flux-pro",
    prompt: "Create a classroom of young robots. The chalkboard in the classroom has 'AI Is Your Friend' written on it."
};

const headers = {
    "Authorization": "Bearer <YOUR_AIMLAPI_KEY>",
    "Content-Type": "application/json"
};

fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => {
    console.log("Generation:", data);
})
.catch(error => {
    console.error("Error:", error);
});


cURL Example

Bash


curl -X POST "https://api.aimlapi.com/v1/images/generations/" \
  -H "Authorization: Bearer <YOUR_AIMLAPI_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "flux-pro",
    "prompt": "Create a classroom of young robots. The chalkboard in the classroom has AI Is Your Friend written on it."
  }'


Available Image Models

Alibaba Cloud Models

Model IDDescriptionalibaba/qwen-imageQwen Image

ByteDance Models

Model IDDescriptionbytedance/seedream-3.0Seedream 3.0bytedance/seededit-3.0-i2iSeedream 3.0 (Image-to-Image)

Flux Models

Model IDDescriptionflux-proFLUX.1 [pro]flux-pro/v1.1FLUX 1.1 [pro]flux-pro/v1.1-ultraFLUX 1.1 [pro ultra]flux-realismFLUX Realism LoRAflux/devFLUX.1 [dev]flux/dev/image-to-imageFLUX.1 [dev] (Image-to-Image)flux/schnellFLUX.1 [schnell]flux/kontext-max/text-to-imageFLUX.1 Kontext [max] (Text-to-Image)flux/kontext-max/image-to-imageFLUX.1 Kontext [max] (Image-to-Image)flux/kontext-pro/text-to-imageFlux.1 Kontext [pro] (Text-to-Image)flux/kontext-pro/image-to-imageFlux.1 Kontext [pro] (Image-to-Image)

Google Models

Model IDDescriptionimagen-3.0-generate-002Imagen 3google/imagen4/previewImagen 4 Previewimagen-4.0-ultra-generate-preview-06-06Imagen 4 Ultra

OpenAI Models

Model IDDescriptiondall-e-2DALL·E 2dall-e-3DALL·E 3openai/gpt-image-1GPT Image 1

Recraft AI Models

Model IDDescriptionrecraft-v3Recraft v3

Stability AI Models

Model IDDescriptionstable-diffusion-v3-mediumStable Diffusion 3stable-diffusion-v35-largeStable Diffusion 3.5 Large

Request Parameters

Required Parameters

•
model (string): The ID of the model to use for image generation

•
prompt (string): A text description of the desired image

Optional Parameters

•
n (integer): The number of images to generate. Default is 1

•
size (string): The size of the generated images. Options vary by model (e.g., "1024x1024", "512x512")

•
quality (string): The quality of the image. Options: "standard", "hd"

•
style (string): The style of the generated images. Options vary by model

•
response_format (string): The format in which the generated images are returned. Options: "url", "b64_json"

Response Format

The API returns a JSON response with the following structure:

JSON


{
  "created": 1677649800,
  "data": [
    {
      "url": "https://example.com/generated-image.png"
    }
  ]
}


For b64_json format:

JSON


{
  "created": 1677649800,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}


Model-Specific Features

Flux Models

•
Support both text-to-image and image-to-image generation

•
Multiple variants available (pro, dev, schnell) with different quality/speed tradeoffs

•
Kontext models support advanced context understanding

Google Imagen Models

•
High-quality photorealistic image generation

•
Advanced prompt understanding and adherence

•
Support for various aspect ratios

OpenAI DALL-E Models

•
DALL-E 2: Good quality, faster generation

•
DALL-E 3: Higher quality, better prompt adherence

•
Support for various sizes and styles

Stability AI Models

•
Stable Diffusion variants with different capabilities

•
Support for fine-tuned models and LoRAs

•
Good for artistic and creative content

Error Handling

Common error responses:

JSON


{
  "error": {
    "message": "Invalid model specified",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}


Common Error Codes

•
400: Bad request (invalid parameters)

•
401: Unauthorized (invalid API key)

•
429: Too many requests (rate limit exceeded)

•
500: Internal server error

Best Practices

1.
Prompt Engineering: Write detailed, specific prompts for better results

2.
Model Selection: Choose the appropriate model based on your use case:

•
Use Flux models for high-quality artistic content

•
Use DALL-E for general-purpose image generation

•
Use Imagen for photorealistic images



3.
Parameter Tuning: Experiment with different parameters to achieve desired results

4.
Rate Limiting: Respect API rate limits to avoid errors

5.
Error Handling: Implement proper error handling in your applications

Integration Examples

Web Application Integration

HTML


<!DOCTYPE html>
<html>
<head>
    <title>Image Generator</title>
</head>
<body>
    <input type="text" id="prompt" placeholder="Enter your prompt">
    <button onclick="generateImage()">Generate Image</button>
    <div id="result"></div>

    <script>
        async function generateImage() {
            const prompt = document.getElementById('prompt').value;
            
            try {
                const response = await fetch('https://api.aimlapi.com/v1/images/generations/', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer YOUR_API_KEY',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'flux-pro',
                        prompt: prompt
                    })
                });
                
                const data = await response.json();
                document.getElementById('result').innerHTML = 
                    `<img src="${data.data[0].url}" alt="Generated image">`;
            } catch (error) {
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>


This documentation provides comprehensive information about using the AIML API for image generation, including all available models, API endpoints, parameters, and practical examples for different programming languages and use cases.

