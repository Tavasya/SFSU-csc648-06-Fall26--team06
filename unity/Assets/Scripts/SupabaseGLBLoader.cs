using UnityEngine;
using UnityGLTF;
using UnityGLTF.Loader;
using UnityEngine.UIElements;
using UnityEngine.Scripting;
using System.Collections;
using UnityEngine.Networking;

[RequireComponent(typeof(LoadingBarUI))]
public class SupabaseGLTFLoader : MonoBehaviour
{
    private string baseAPIUrl;
    [SerializeField] private UIDocument uIDocument; // reference to UI
    public GameObject loadedModel; // Static reference to the loaded model
    public static SupabaseGLTFLoader Instance { get; private set; } // Singleton instance

    [SerializeField] private GameObject testRoom;

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        else
        {
            Instance = this;
        }

        if (testRoom != null)
            loadedModel = testRoom;
       
    }

    void Start()
    {
        // Lock Cursor to the center of the screen and hide it
        UnityEngine.Cursor.lockState = CursorLockMode.Locked;
        UnityEngine.Cursor.visible = false;

        // Initially hide the error message panel
        HideErrorMessage();
    }

    [Preserve]
    public void ImportScan(string json)
    {
        RoomData roomData = JsonUtility.FromJson<RoomData>(json);
        baseAPIUrl = roomData.baseAPIUrl;
        StartCoroutine(ImportScanCoroutine(roomData.scanId));
    }

    private IEnumerator ImportScanCoroutine(string scanId)
    {

        if (string.IsNullOrEmpty(baseAPIUrl))
        {
            UpdateErrorMessage(
                "Error",
                "Base API URL is not set. Please set it before calling ImportScan."
            );
            yield break;
        }

        GetComponent<LoadingBarUI>().UpdateBar(10f); // Reset loading bar to 0%

        // URL  
        string uriDir = $"{baseAPIUrl}/api/rooms/{scanId}";
        string filename = "3d-model";

        // Check if file exists on server
        using (UnityWebRequest request = UnityWebRequest.Head($"{uriDir}/{filename}"))
        {
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                UpdateErrorMessage(
                    "Network Error",
                    request.error
                );

                GetComponent<LoadingBarUI>().DisableUIDocument(); // Disable the UI Document after showing the error

                yield break;
            }

            if (request.responseCode == 404)
            {
                UpdateErrorMessage(
                    "Not Found",
                    $"Model for room '{scanId}' does not exist."
                );

                GetComponent<LoadingBarUI>().DisableUIDocument(); // Disable the UI Document after showing the error

                yield break;
            }

            if (request.responseCode >= 400)
            {
                UpdateErrorMessage(
                    $"HTTP {request.responseCode}",
                    "Server returned an error."
                );

                GetComponent<LoadingBarUI>().DisableUIDocument(); // Disable the UI Document after showing the error

                yield break;
            }
        }
        GetComponent<LoadingBarUI>().UpdateBar(50f); // Update loading bar to 50%

        // Set up the GLTFSceneImporter with the UnityWebRequestLoader
        var importOptions = new ImportOptions();
        importOptions.DataLoader = new UnityWebRequestLoader(uriDir);

        var importer = new GLTFSceneImporter(
            filename,
            importOptions
        );

        importer.SceneParent = transform;

        // download and load the GLB model asynchronously
        var task = importer.LoadSceneAsync();
        GetComponent<LoadingBarUI>().UpdateBar(70f); // Update loading bar to 70%

        yield return new WaitUntil(() => task.IsCompleted);

        // Check for errors during loading
        if (task.IsFaulted)
        {
            Debug.LogError(task.Exception);

            UpdateErrorMessage(
                "Load Failed",
                task.Exception?.ToString()
            );

            GetComponent<LoadingBarUI>().DisableUIDocument(); // Disable the UI Document after showing the error

            yield break;
        }

        HideErrorMessage(); // hide the error message panel after successful loading
        GetComponent<LoadingBarUI>().UpdateBar(100f); // Update loading bar to 100%

        yield return new WaitForSeconds(1f); // optional, waits for a moment to show the full loading bar
        GetComponent<LoadingBarUI>().DisableUIDocument(); // disable the UI Document after loading is complete

        // store the loaded model reference
        loadedModel = importer.LastLoadedScene;

        // alert browser that import is done
        WebBridge.SignalRSVPReady();
    }

    private void UpdateErrorMessage(string title, string message)
    {
        uIDocument.enabled = true; // Ensure the UI Document is enabled to show the error message

        uIDocument.rootVisualElement.Q<VisualElement>("Panel").style.display = DisplayStyle.Flex; // Show the error message panel

        var root = uIDocument.rootVisualElement;
        var panel = root.Q<VisualElement>("Panel");
        var errorTitleLabel = panel.Q<Label>("Title");
        var errorMessageLabel = panel.Q<Label>("Description");

        if (errorTitleLabel != null && errorMessageLabel != null)
        {
            errorTitleLabel.text = title;
            errorMessageLabel.text = message;
        }
    }

    private void HideErrorMessage()
    {
        // Hide the error message panel
        uIDocument.rootVisualElement.Q<VisualElement>("Panel").style.display = DisplayStyle.None;
    }
}
