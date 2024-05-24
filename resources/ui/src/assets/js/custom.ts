
import { fetchAuthSession } from "aws-amplify/auth";

export async function getIdToken() {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  }

export async function getAccessToken() {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
} 

async function getHeaders() {

  return {
    Authorization: `Bearer ${await getAccessToken()}`,
    "Content-Type": "application/json",
  };
}

export async function callAPI(resource: string, method: string = "GET", body: any = null): Promise<any> {
  const result = await fetch("/aws-exports.json");
  const awsExports = await result.json();

  const url = `${awsExports.domainName}/${resource}`;
  const headers = await getHeaders();
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
export async function callStreamingAPI(resource: string, method: string = "GET", body: any = null): Promise<any> {
  const result = await fetch("/aws-exports.json");
  const awsExports = await result.json();
  const url = `${awsExports.domainName}/${resource}`;

  try {
    const headers = await getHeaders();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.message || "Network response was not ok");
    }

    const reader = response.body?.getReader();
    const stream = new ReadableStream({
      start(controller) {
        // Define the function to pull data from the reader
        function pull() {
          reader?.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            // Enqueue the chunk into the stream
            controller.enqueue(value);
            // Pull the next chunk
            pull();
          }).catch(error => {
            controller.error(error);
          });
        }
        // Start pulling data
        pull();
      }
    });

    // Create a new response with the streamed body
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    throw error;
  }
}

