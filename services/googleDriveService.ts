// This tells TypeScript that the 'google' global object will be available at runtime.
declare var google: any

const CLIENT_ID = typeof process !== "undefined" && process.env ? process.env.GOOGLE_CLIENT_ID : undefined

if (!CLIENT_ID) {
  console.warn("GOOGLE_CLIENT_ID environment variable not set. Google Drive integration will be disabled.")
}

const SCOPES = "https://www.googleapis.com/auth/drive.file"

interface TokenResponse {
  access_token: string
}

export const googleDriveService = {
  isConfigured: (): boolean => !!CLIENT_ID,

  initTokenClient: (callback: (tokenResponse: any) => void): any => {
    if (!CLIENT_ID || typeof google === "undefined") return null
    return google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: callback,
    })
  },

  createDoc: async (accessToken: string, title: string, content: string): Promise<void> => {
    const boundary = "-------314159265358979323846"
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    const metadata = {
      name: `${title}.txt`,
      mimeType: "text/plain",
    }

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
      content +
      close_delim

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: new Headers({
        Authorization: "Bearer " + accessToken,
        "Content-Type": "multipart/related; boundary=" + boundary,
      }),
      body: multipartRequestBody,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to create file in Google Drive: ${errorData.error.message}`)
    }
  },
}
