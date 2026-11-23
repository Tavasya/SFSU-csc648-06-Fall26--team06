using UnityEngine;
using UnityEngine.UIElements;

public class LoadingBarUI : MonoBehaviour
{
    [SerializeField] private UIDocument uiDocument;
    private VisualElement loadingBar;
    private string currStyle;

    void Awake()
    {
        // find references
        loadingBar = uiDocument.rootVisualElement.Q<VisualElement>("Panel")
            .Q<VisualElement>("Pad")
            .Q<VisualElement>("LoadingContainer")
            .Q<VisualElement>("LoadingBar");
    }

    public void UpdateBar(float progress)
    {
        if (progress < 0f || progress > 100f)
        {
            Debug.LogError("Progress value must be between 0 and 100.");
            return;
        }

        string newStyle = $"progress-{Mathf.RoundToInt(progress)}";

        if (currStyle != null)
            loadingBar.RemoveFromClassList(currStyle); // Remove the previous class

        loadingBar.AddToClassList(newStyle); // Add the class to the loading bar
        currStyle = newStyle;
    }

    public void DisableUIDocument()
    {
        uiDocument.enabled = false;
    }


}
