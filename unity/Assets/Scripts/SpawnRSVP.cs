using UnityEngine;
using System.Collections.Generic;

[System.Serializable]
public class ColorMatch
{
    public string colorName;
    public Material material;
}

[System.Serializable]
public class CustomizationData
{
    public string skinColor;
    public string outfitColor;
    public string hairColor;
    public string gender;
}

[System.Serializable]
public class RSVPData
{
    public string id;
    public string username;
    public string profilePictureUrl;
    public CustomizationData customization;
}

[System.Serializable]
public class RSVPList
{
    public RSVPData[] rsvps;
    public RSVPData hostData;
}

public class SpawnRSVP : MonoBehaviour
{
  [SerializeField] private LayerMask attendeeLayer;
  [SerializeField] private GameObject hostPrefab;
  [SerializeField] private float spaceRadius = 1f; // Minimum distance between attendees

  [Header("Models")]
  [SerializeField] private GameObject maleModel;
  [SerializeField] private GameObject femaleModel;
  [SerializeField] private GameObject maleHost;
  [SerializeField] private GameObject femaleHost;
  

  [Header("Customization")]
  [SerializeField] private List<ColorMatch> skinMatches;
  [SerializeField] private List<Material> outfitMaterials;
  [SerializeField] private List<Material> hairMaterials;
  

  // Testing
  private string testJson = @"
  {
      ""hostData"": {
          ""id"": ""host_001"",
          ""username"": ""ProfessorSmith"",
          ""profilePictureUrl"": ""https://example.com/professor-smith.png"",
          ""customization"": {
              ""skinColor"": ""Rich"",
              ""outfitColor"": ""Navy"",
              ""hairColor"": ""Gray"",
              ""gender"": ""M""
          }
      },
      ""rsvps"": [
          {
              ""id"": ""user_001"",
              ""username"": ""Alice"",
              ""profilePictureUrl"": ""https://example.com/alice.png"",
              ""customization"": {
                  ""skinColor"": ""Fair"",
                  ""outfitColor"": ""Blue"",
                  ""hairColor"": ""Blonde"",
                  ""gender"": ""F""
              }
          },
          {
              ""id"": ""user_002"",
              ""username"": ""Bob"",
              ""profilePictureUrl"": ""https://example.com/bob.png"",
              ""customization"": {
                  ""skinColor"": ""Light"",
                  ""outfitColor"": ""Red"",
                  ""hairColor"": ""Brown"",
                  ""gender"": ""M""
              }
          },
          {
              ""id"": ""user_003"",
              ""username"": ""Charlie"",
              ""profilePictureUrl"": ""https://example.com/charlie.png"",
              ""customization"": {
                  ""skinColor"": ""Medium"",
                  ""outfitColor"": ""Green"",
                  ""hairColor"": ""Black"",
                  ""gender"": ""NB""
              }
          },
          {
              ""id"": ""user_004"",
              ""username"": ""Diana"",
              ""profilePictureUrl"": ""https://example.com/diana.png"",
              ""customization"": {
                  ""skinColor"": ""Tan"",
                  ""outfitColor"": ""Purple"",
                  ""hairColor"": ""Red"",
                  ""gender"": ""F""
              }
          },
          {
              ""id"": ""user_005"",
              ""username"": ""Ethan"",
              ""profilePictureUrl"": ""https://example.com/ethan.png"",
              ""customization"": {
                  ""skinColor"": ""Deep"",
                  ""outfitColor"": ""Black"",
                  ""hairColor"": ""Gray"",
                  ""gender"": ""M""
              }
          }
      ]
  }";


  // Method used in editor to test spawn functionality
  [ContextMenu("Test Spawn RSVPs")]
  void TestSpawnRSVP()
  {
    SpawnRSVPs(testJson);
  }


  // Method called in browser using SendMessage
  void SpawnRSVPs(string json)
  {
    RSVPList rsvpList = JsonUtility.FromJson<RSVPList>(json);

    GameObject room = SupabaseGLTFLoader.Instance.loadedModel; // Reference to the loaded model
    if (room == null)
    {
        Debug.LogError("No loaded model found. Make sure the model is loaded before spawning RSVPs.");
        return;
    }

    // store renderer references
    Renderer meshRenderer = room.GetComponentInChildren<MeshRenderer>();
    GameObject meshHolder = meshRenderer != null ? meshRenderer.gameObject : null;
    if (meshHolder != null && meshHolder.GetComponent<MeshCollider>() == null)
    {
        meshHolder.AddComponent<MeshCollider>(); // Add a MeshCollider to the loaded model
    }

    if (meshRenderer == null)
    {
        Debug.LogError("No Renderer found in the loaded model.");
        return;
    }

    Bounds bounds = meshRenderer.bounds;

    // spawns host
    InstantiateAttendee(rsvpList.hostData, bounds, true);

    // spawn attendees
    foreach (RSVPData rsvp in rsvpList.rsvps)
      InstantiateAttendee(rsvp, bounds, false);

  }


  /*
    Given bounds, returns a Vector 3 in a rooms
    location that spawns the avatar on the ground
  */
  Vector3 GeneratePosition(Bounds bounds)
  {
    float x = Random.Range(bounds.min.x, bounds.max.x);
    float z = Random.Range(bounds.min.z, bounds.max.z);

    Vector3 rayOrigin = new Vector3(x, bounds.max.y - 1f, z); // Start the ray from below the top (roof)

    // spawn at lowest floor found
    if (Physics.Raycast(rayOrigin, Vector3.down, out RaycastHit hit, 100f))
      return hit.point;

    Debug.Log("No valid position found. Check for collider");
    return Vector3.zero; // Return zero vector if no valid position is found
  }


  bool IsFree(Vector3 position)
  {
    return !Physics.CheckSphere(position, spaceRadius, attendeeLayer); 
  }


  Quaternion GetRandomRotation()
  {
      float randomYRotation = Random.Range(0f, 360f);
      return Quaternion.Euler(0f, randomYRotation, 0f);
  }

  /* ATTENDEE CUSTOMIZATION */
  private void InstantiateAttendee(RSVPData rsvp, Bounds bounds, bool isHost = false)
  {
    // attempt spawning attendee until its spawned
    for (int attempt = 0; attempt < 10; attempt++) // Try up to 10 times to find a valid position
    {
      Vector3 position = GeneratePosition(bounds);
      if (position == Vector3.zero || !IsFree(position))
      {
        Debug.Log($"No valid position found for {rsvp.username}. Skipping spawn.");
        continue;
      }

      // get character model by gender
      GameObject attendeePrefab = GetModelByGender(rsvp.customization.gender, isHost);
      if (attendeePrefab == null)
      {
          Debug.LogError($"No valid attendee prefab found for gender: {rsvp.customization.gender}");
          return;
      }

      // instantiate avatar
      GameObject attendee = Instantiate(attendeePrefab, position, GetRandomRotation());
      attendee.name = rsvp.username;
    
      // Update attendee info
      Attendee attendeeScript = attendee.GetComponentInChildren<Attendee>();
      UserObject data = ScriptableObject.CreateInstance<UserObject>();
      data.username = rsvp.username;
      data.id = rsvp.id;
      attendeeScript.UpdateAttendeeInfo(data);

      // Update attendee visual
      if (rsvp.customization != null)
        UpdateAttendeeModel(attendee, rsvp.customization);

      break;
    }
  }
  private GameObject GetModelByGender(string gender, bool isHost = false)
  {
      gender = gender?.ToLower() ?? "m"; // gender defaults to male if not given

      switch (gender)
      {
          case "m":
              if (isHost) return maleHost;
              return maleModel;
          case "f":
              if (isHost) return femaleHost;
              return femaleModel;
          default:
              return maleModel; // defaults to male model
      }
  }

  private void UpdateAttendeeModel(GameObject attendee, CustomizationData data)
  {
      AttendeeMaterials materials = attendee.GetComponentInChildren<AttendeeMaterials>();
      if (materials == null)
      {
          Debug.LogError("AttendeeMaterials component not found on attendee.");
          return;
      }

      if (materials.skin != null && materials.skin.Count > 0)
      {
          Material skinMaterial = GetSkinMaterial(data.skinColor);
          if (skinMaterial != null)
              materials.SetMaterial(materials.skin, skinMaterial);
      }

      if (materials.hair != null && materials.hair.Count > 0)
      {
          Material hairMaterial = GetMaterialFromName(data.hairColor, hairMaterials);
          if (hairMaterial != null)
              materials.SetMaterial(materials.hair, hairMaterial);
      }

      if (materials.shirt != null && materials.shirt.Count > 0)
      {
          Material shirtMaterial = GetMaterialFromName(data.outfitColor, outfitMaterials);
          if (shirtMaterial != null)
              materials.SetMaterial(materials.shirt, shirtMaterial);
      }

  }


  /* COLOR MATCHING */
  private Material GetSkinMaterial(string colorName)
  {
    if (colorName == null) return null;

    // finds materials in list
    string lowerColorName = colorName.ToLower();
      foreach (ColorMatch match in skinMatches)
      {
          if (match.colorName.ToLower().Equals(lowerColorName))
              return match.material;
      }

      Debug.LogWarning($"No skin material found for color: {colorName}");
      return null; // Return null if no match is found
  }

  private Material GetMaterialFromName(string colorName, List<Material> materialList)
  {
    if (colorName == null) return null;

    // finds materials in list
    string lowerColorName = colorName.ToLower();
    foreach (Material material in materialList)
    {
        if (material.name.ToLower().Equals(lowerColorName))
            return material;
    }

    Debug.LogWarning($"No material found for name: {colorName}");
    return null; // Return null if no match is found
  }

}